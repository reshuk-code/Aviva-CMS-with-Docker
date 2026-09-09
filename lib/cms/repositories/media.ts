import "server-only";

import { NotFoundError, ValidationError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import { getStorage, mediaKindFor } from "@/lib/storage";
import type { FilterCondition, ID, Paginated } from "@/types/common";
import type { MediaItem, MediaKind } from "@/types/content";

const SEARCH_FIELDS = ["filename", "altText", "caption", "description"];

/** Ceiling for the folder scan. Well past what a brochure site accumulates. */
const FOLDER_SCAN_LIMIT = 2000;

async function collection() {
  return (await getDatabase()).collection<MediaItem>("media");
}

export interface MediaListOptions {
  page?: number;
  perPage?: number;
  search?: string;
  kind?: MediaKind | "any";
  /** "" = every folder, "root" = files with no folder, otherwise the name. */
  folder?: string;
  sort?: string;
  order?: "asc" | "desc";
}

/**
 * Media repository.
 *
 * Two stores are in play: the file lives with the *storage* adapter, its
 * metadata with the *database* adapter. This repository is the only place that
 * knows they must be kept in step.
 *
 * The write order matters. Upload first, record second: a file with no record
 * is an orphan nobody sees, while a record with no file is a broken image on
 * the live site. Deletion runs the same way round — the record goes only after
 * the file is gone.
 *
 * TODO(phase-4): copying between backends moves records but not files; see
 * "Media migration" in docs/ROADMAP.md.
 */
export const media = {
  async list(options?: MediaListOptions): Promise<Paginated<MediaItem>> {
    const store = await collection();

    const page = Math.max(1, options?.page ?? 1);
    const perPage = Math.min(100, Math.max(1, options?.perPage ?? 24));

    const where: FilterCondition[] = [];

    if (options?.kind && options.kind !== "any") {
      where.push({ field: "kind", op: "eq", value: options.kind });
    }

    if (options?.folder) {
      where.push({
        field: "folder",
        op: "eq",
        value: options.folder === "root" ? null : options.folder,
      });
    }

    const search = options?.search?.trim();

    return store.list({
      where: where.length ? where : undefined,
      search: search ? { term: search, fields: SEARCH_FIELDS } : undefined,
      sort: [
        {
          field: options?.sort || "createdAt",
          direction: options?.order ?? "desc",
        },
      ],
      limit: perPage,
      offset: (page - 1) * perPage,
    });
  },

  async get(id: ID): Promise<MediaItem | null> {
    return (await collection()).findById(id);
  },

  /**
   * Resolves several ids at once, for a gallery field holding a list of them.
   * Missing ids are skipped rather than throwing: a deleted file should leave
   * a gap in a gallery, not break the page rendering it.
   */
  async getMany(ids: ID[]): Promise<MediaItem[]> {
    if (ids.length === 0) return [];

    const store = await collection();
    const found = await store.findMany({
      where: [{ field: "id", op: "in", value: ids }],
      limit: ids.length,
    });

    const byId = new Map(found.map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item) => item !== undefined);
  },

  /** The folders in use, for the filter dropdown and the picker. */
  async folders(): Promise<string[]> {
    const store = await collection();
    const items = await store.findMany({ limit: FOLDER_SCAN_LIMIT });

    const names = new Set<string>();
    for (const item of items) {
      if (item.folder) names.add(item.folder);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  },

  /**
   * Stores a file and records it.
   *
   * `width`/`height` stay null: reading image dimensions needs an image
   * decoder, and the CMS deliberately ships no native dependency. The frontend
   * gets them from the browser or from a transforming CDN.
   */
  async upload(input: {
    filename: string;
    mimeType: string;
    body: Buffer | Uint8Array | ArrayBuffer;
    folder?: string | null;
    altText?: string | null;
    uploadedBy?: ID | null;
  }): Promise<MediaItem> {
    const filename = input.filename.trim();
    if (!filename) {
      throw new ValidationError("That file has no name.", {
        file: ["That file has no name."],
      });
    }

    const storage = await getStorage();
    const stored = await storage.upload({
      filename,
      mimeType: input.mimeType || "application/octet-stream",
      body: input.body,
      folder: input.folder ?? null,
    });

    const store = await collection();

    try {
      return await store.create({
        key: stored.key,
        url: stored.url,
        filename,
        mimeType: stored.mimeType,
        kind: mediaKindFor(stored.mimeType),
        size: stored.size,
        width: null,
        height: null,
        altText: input.altText ?? null,
        caption: null,
        description: null,
        folder: input.folder ?? null,
        uploadedBy: input.uploadedBy ?? null,
      });
    } catch (error) {
      // The record is what makes the file reachable. Without it the upload is
      // invisible and would leak bucket space, so undo it.
      await storage.delete(stored.key).catch(() => undefined);
      throw error;
    }
  },

  async update(
    id: ID,
    input: {
      altText: string | null;
      caption: string | null;
      description: string | null;
      folder: string | null;
    },
  ): Promise<MediaItem> {
    const store = await collection();

    // Moving between folders is metadata only: the storage key is stable, so
    // every URL already published in a page stays valid.
    const updated = await store.update(id, {
      altText: input.altText,
      caption: input.caption,
      description: input.description,
      folder: input.folder,
    });

    if (!updated) throw new NotFoundError("Media item");
    return updated;
  },

  /**
   * Removes the file and its record.
   *
   * Nothing checks whether the file is referenced by a page first: references
   * are plain URLs in arbitrary fields, so an honest check is impossible until
   * fields carry media ids. The confirmation dialog says so.
   */
  async delete(id: ID): Promise<boolean> {
    const store = await collection();

    const item = await store.findById(id);
    if (!item) return false;

    const storage = await getStorage();
    // A missing file is not a reason to keep a dangling record.
    await storage.delete(item.key).catch(() => undefined);

    return store.delete(id);
  },
};
