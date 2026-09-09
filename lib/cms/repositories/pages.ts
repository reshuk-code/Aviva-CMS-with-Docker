import "server-only";

import { getDatabase } from "@/lib/database";
import { ConflictError, NotFoundError } from "@/lib/cms/errors";
import { normaliseSlug } from "@/schemas/common";
import type { PageInputParsed } from "@/schemas/page";
import type { ListOptions, Paginated } from "@/types/common";
import type { CmsPage, CmsPageNode } from "@/types/page";

import {
  buildListQuery,
  isPubliclyVisible,
  PUBLIC_STATUS_FILTER,
  resolvePublication,
} from "./base";

const SEARCH_FIELDS = ["title", "slug", "excerpt"];

/** Who performed a write, for audit fields. */
export interface WriteContext {
  userId: string | null;
}

async function collection() {
  return (await getDatabase()).collection<CmsPage>("pages");
}

/**
 * Pages repository.
 *
 * Owns every rule about pages that is not storage-specific: slug uniqueness,
 * publication windows, parent/child integrity, duplication.
 */
export const pages = {
  /** Admin listing: every status, paginated and searchable. */
  async list(options?: ListOptions): Promise<Paginated<CmsPage>> {
    const store = await collection();
    return store.list(buildListQuery(options, SEARCH_FIELDS));
  },

  async get(id: string): Promise<CmsPage | null> {
    return (await collection()).findById(id);
  },

  /**
   * Frontend lookup. Returns null for drafts and for scheduled pages whose
   * time has not arrived, so an unpublished page 404s rather than leaking.
   */
  async getBySlug(slug: string): Promise<CmsPage | null> {
    const page = await this.getBySlugIncludingDrafts(slug);
    return page && isPubliclyVisible(page) ? page : null;
  },

  /** Preview/admin lookup: ignores publication state. */
  async getBySlugIncludingDrafts(slug: string): Promise<CmsPage | null> {
    const store = await collection();
    return store.findOne({
      where: [{ field: "slug", op: "eq", value: normaliseSlug(slug) }],
    });
  },

  /** Every publicly visible page. Used by the sitemap and menu builders. */
  async getPublished(options?: ListOptions): Promise<CmsPage[]> {
    const store = await collection();
    const candidates = await store.findMany({
      where: [PUBLIC_STATUS_FILTER],
      sort: [{ field: options?.sort ?? "order", direction: options?.order ?? "asc" }],
    });
    return candidates.filter((page) => isPubliclyVisible(page));
  },

  /** Pages flagged for the navigation builder, in display order. */
  async getNavigable(): Promise<CmsPage[]> {
    const published = await this.getPublished();
    return published
      .filter((page) => page.showInNavigation)
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  },

  async count(options?: ListOptions): Promise<number> {
    const store = await collection();
    return store.count(buildListQuery(options, SEARCH_FIELDS));
  },

  async create(input: PageInputParsed, ctx: WriteContext): Promise<CmsPage> {
    const store = await collection();
    await assertSlugFree(input.slug, null);

    return store.create({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      featuredImage: input.featuredImage,
      parentId: input.parentId,
      order: input.order,
      showInNavigation: input.showInNavigation,
      template: input.template,
      status: input.status,
      publishedAt: resolvePublication(input.status, input.publishedAt, null),
      updatedBy: ctx.userId,
      seo: input.seo,
      meta: input.meta,
    });
  },

  async update(
    id: string,
    input: PageInputParsed,
    ctx: WriteContext,
  ): Promise<CmsPage> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Page");

    await assertSlugFree(input.slug, id);
    await assertNotOwnAncestor(id, input.parentId);

    const updated = await store.update(id, {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      body: input.body,
      featuredImage: input.featuredImage,
      parentId: input.parentId,
      order: input.order,
      showInNavigation: input.showInNavigation,
      template: input.template,
      status: input.status,
      publishedAt: resolvePublication(
        input.status,
        input.publishedAt,
        existing.publishedAt,
      ),
      updatedBy: ctx.userId,
      seo: input.seo,
      meta: input.meta,
    });

    if (!updated) throw new NotFoundError("Page");
    return updated;
  },

  /** Status-only change, used by the row actions in the pages table. */
  async setStatus(
    id: string,
    status: CmsPage["status"],
    ctx: WriteContext,
  ): Promise<CmsPage> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Page");

    const updated = await store.update(id, {
      status,
      publishedAt: resolvePublication(status, null, existing.publishedAt),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Page");
    return updated;
  },

  /** Moves a page to the trash. Reversible; `delete` is not. */
  async trash(id: string, ctx: WriteContext): Promise<CmsPage> {
    return this.setStatus(id, "trash", ctx);
  },

  /** Permanent removal. Children are re-parented to the deleted page's parent. */
  async delete(id: string): Promise<boolean> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) return false;

    const children = await store.findMany({
      where: [{ field: "parentId", op: "eq", value: id }],
    });

    await Promise.all(
      children.map((child) =>
        store.update(child.id, { parentId: existing.parentId }),
      ),
    );

    return store.delete(id);
  },

  /** Copies a page as a draft with a free slug, WordPress-style. */
  async duplicate(id: string, ctx: WriteContext): Promise<CmsPage> {
    const store = await collection();
    const source = await store.findById(id);
    if (!source) throw new NotFoundError("Page");

    const slug = await findFreeSlug(source.slug);

    return store.create({
      ...source,
      id: undefined,
      title: `${source.title} (copy)`,
      slug,
      status: "draft",
      publishedAt: null,
      showInNavigation: false,
      updatedBy: ctx.userId,
    } as Omit<CmsPage, "id" | "createdAt" | "updatedAt"> & { id?: string });
  },

  /** Nested view for the page tree and parent pickers. */
  async tree(): Promise<CmsPageNode[]> {
    const store = await collection();
    const all = await store.findMany({
      where: [{ field: "status", op: "ne", value: "trash" }],
      sort: [{ field: "order", direction: "asc" }],
    });

    const nodes = new Map<string, CmsPageNode>(
      all.map((page) => [page.id, { ...page, children: [] }]),
    );
    const roots: CmsPageNode[] = [];

    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    return roots;
  },

  /** Minimal projection of every page, for the route-ownership view. */
  async summaries(): Promise<
    Pick<CmsPage, "id" | "slug" | "title" | "status">[]
  > {
    const store = await collection();
    const all = await store.findMany({});
    return all.map(({ id, slug, title, status }) => ({ id, slug, title, status }));
  },
};

async function assertSlugFree(slug: string, ignoreId: string | null) {
  const store = await collection();
  const existing = await store.findOne({
    where: [{ field: "slug", op: "eq", value: slug }],
  });

  if (existing && existing.id !== ignoreId) {
    throw new ConflictError(
      `The slug "${slug}" is already used by "${existing.title}".`,
      "slug",
    );
  }
}

/** Prevents a page from becoming its own ancestor, which would loop `tree()`. */
async function assertNotOwnAncestor(id: string, parentId: string | null) {
  if (!parentId) return;
  if (parentId === id) {
    throw new ConflictError("A page cannot be its own parent.", "parentId");
  }

  const store = await collection();
  let cursor: string | null = parentId;
  const seen = new Set<string>();

  while (cursor) {
    if (cursor === id) {
      throw new ConflictError(
        "That parent is a child of this page, which would create a loop.",
        "parentId",
      );
    }
    if (seen.has(cursor)) break;
    seen.add(cursor);

    const parent: CmsPage | null = await store.findById(cursor);
    cursor = parent?.parentId ?? null;
  }
}

async function findFreeSlug(base: string): Promise<string> {
  const store = await collection();
  const root = base === "/" ? "/home" : base;

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = normaliseSlug(`${root}-${suffix}`);
    const taken = await store.findOne({
      where: [{ field: "slug", op: "eq", value: candidate }],
    });
    if (!taken) return candidate;
  }

  return normaliseSlug(`${root}-${Date.now()}`);
}
