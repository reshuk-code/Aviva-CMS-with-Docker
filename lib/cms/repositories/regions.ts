import "server-only";

import { ConflictError, NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import { slugify } from "@/schemas/common";
import type { RegionInputParsed } from "@/schemas/region";
import type { FilterCondition, ListOptions, Paginated } from "@/types/common";
import type { Region } from "@/types/content";

import {
  buildListQuery,
  isPubliclyVisible,
  PUBLIC_STATUS_FILTER,
  resolvePublication,
} from "./base";
import type { WriteContext } from "./pages";

const SEARCH_FIELDS = ["name", "slug", "shortDescription", "country"];

/** Ceiling for the country scan. See the note on `media.folders()`. */
const FACET_SCAN_LIMIT = 2000;

async function collection() {
  return (await getDatabase()).collection<Region>("regions");
}

export interface RegionListOptions extends ListOptions {
  country?: string;
  featured?: boolean;
}

/**
 * Regions repository.
 *
 * The area a trip happens in — Everest, Annapurna — one level above a
 * destination. It is a content type rather than a taxonomy because a region
 * sells: it carries photographs, prose and its own page.
 *
 * It does **not** own `Destination.region`, which stays free text. Making that
 * a reference would rewrite a field eight display sites already read, and would
 * strand any destination whose current text matches no record here.
 *
 * Slugs are bare, like destinations: the project decides whether these live at
 * `/regions/everest` or somewhere else entirely.
 */
export const regions = {
  async list(options?: RegionListOptions): Promise<Paginated<Region>> {
    const store = await collection();
    const query = buildListQuery(options, SEARCH_FIELDS);

    const where: FilterCondition[] = [...(query.where ?? [])];
    if (options?.country) {
      where.push({ field: "country", op: "eq", value: options.country });
    }
    if (options?.featured !== undefined) {
      where.push({ field: "featured", op: "eq", value: options.featured });
    }

    return store.list({
      ...query,
      where: where.length ? where : undefined,
      sort: [
        {
          field: options?.sort || "updatedAt",
          direction: options?.order ?? "desc",
        },
      ],
    });
  },

  async get(id: string): Promise<Region | null> {
    return (await collection()).findById(id);
  },

  /** Frontend lookup. Drafts and not-yet-due scheduled records return null. */
  async getBySlug(slug: string): Promise<Region | null> {
    const found = await this.getBySlugIncludingDrafts(slug);
    return found && isPubliclyVisible(found) ? found : null;
  },

  /** Preview/admin lookup: ignores publication state. */
  async getBySlugIncludingDrafts(slug: string): Promise<Region | null> {
    const store = await collection();
    return store.findOne({
      where: [{ field: "slug", op: "eq", value: slugify(slug) }],
    });
  },

  /** Published regions in display order — the listing page. */
  async getPublished(options?: RegionListOptions): Promise<Region[]> {
    const store = await collection();

    const where: FilterCondition[] = [PUBLIC_STATUS_FILTER];
    if (options?.country) {
      where.push({ field: "country", op: "eq", value: options.country });
    }
    if (options?.featured !== undefined) {
      where.push({ field: "featured", op: "eq", value: options.featured });
    }

    const candidates = await store.findMany({
      where,
      sort: [
        { field: options?.sort ?? "order", direction: options?.order ?? "asc" },
      ],
    });

    const visible = candidates.filter((record) => isPubliclyVisible(record));
    return options?.perPage ? visible.slice(0, options.perPage) : visible;
  },

  /** The homepage set: featured, published, in order. */
  async getFeatured(limit = 6): Promise<Region[]> {
    return this.getPublished({ featured: true, perPage: limit });
  },

  async count(options?: RegionListOptions): Promise<number> {
    const store = await collection();
    return store.count(buildListQuery(options, SEARCH_FIELDS));
  },

  /** Countries in use, for the filter dropdown and the editor's datalist. */
  async countries(): Promise<string[]> {
    const store = await collection();
    const all = await store.findMany({
      where: [{ field: "status", op: "ne", value: "trash" }],
      limit: FACET_SCAN_LIMIT,
    });

    const names = new Set<string>();
    for (const record of all) {
      if (record.country) names.add(record.country);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  },

  /** Minimal projection, for any picker that later references a region. */
  async options(): Promise<{ id: string; name: string; slug: string }[]> {
    const store = await collection();
    const all = await store.findMany({
      where: [{ field: "status", op: "ne", value: "trash" }],
      sort: [{ field: "name", direction: "asc" }],
      limit: FACET_SCAN_LIMIT,
    });

    return all.map(({ id, name, slug }) => ({ id, name, slug }));
  },

  async create(input: RegionInputParsed, ctx: WriteContext): Promise<Region> {
    const store = await collection();
    await assertSlugFree(input.slug, null);

    return store.create({
      ...fields(input),
      publishedAt: resolvePublication(input.status, input.publishedAt, null),
      updatedBy: ctx.userId,
    });
  },

  async update(
    id: string,
    input: RegionInputParsed,
    ctx: WriteContext,
  ): Promise<Region> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Region");

    await assertSlugFree(input.slug, id);

    const updated = await store.update(id, {
      ...fields(input),
      publishedAt: resolvePublication(
        input.status,
        input.publishedAt,
        existing.publishedAt,
      ),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Region");
    return updated;
  },

  async setStatus(
    id: string,
    status: Region["status"],
    ctx: WriteContext,
  ): Promise<Region> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Region");

    const updated = await store.update(id, {
      status,
      publishedAt: resolvePublication(status, null, existing.publishedAt),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Region");
    return updated;
  },

  async trash(id: string, ctx: WriteContext): Promise<Region> {
    return this.setStatus(id, "trash", ctx);
  },

  async delete(id: string): Promise<boolean> {
    return (await collection()).delete(id);
  },

  async duplicate(id: string, ctx: WriteContext): Promise<Region> {
    const store = await collection();
    const source = await store.findById(id);
    if (!source) throw new NotFoundError("Region");

    return store.create({
      ...source,
      id: undefined,
      name: `${source.name} (copy)`,
      slug: await findFreeSlug(source.slug),
      faqs: source.faqs?.map((faq) => ({ ...faq, id: crypto.randomUUID() })) ?? [],
      status: "draft",
      publishedAt: null,
      featured: false,
      updatedBy: ctx.userId,
    } as Omit<Region, "id" | "createdAt" | "updatedAt"> & { id?: string });
  },
};

/** The fields the form owns, shared by create and update. */
function fields(input: RegionInputParsed) {
  return {
    name: input.name,
    slug: input.slug,
    shortDescription: input.shortDescription,
    description: input.description,
    featuredImage: input.featuredImage,
    featuredImageHorizontal: input.featuredImageHorizontal,
    featuredImageVertical: input.featuredImageVertical,
    bannerImage: input.bannerImage,
    gallery: input.gallery,
    country: input.country,
    elevationRange: input.elevationRange,
    highlights: input.highlights,
    faqs: input.faqs,
    bestSeason: input.bestSeason,
    featured: input.featured,
    order: input.order,
    status: input.status,
    seo: input.seo,
  };
}

async function assertSlugFree(slug: string, ignoreId: string | null) {
  const store = await collection();
  const existing = await store.findOne({
    where: [{ field: "slug", op: "eq", value: slug }],
  });

  if (existing && existing.id !== ignoreId) {
    throw new ConflictError(
      `The slug "${slug}" is already used by "${existing.name}".`,
      "slug",
    );
  }
}

async function findFreeSlug(base: string): Promise<string> {
  const store = await collection();

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = slugify(`${base}-${suffix}`);
    const taken = await store.findOne({
      where: [{ field: "slug", op: "eq", value: candidate }],
    });
    if (!taken) return candidate;
  }

  return slugify(`${base}-${Date.now()}`);
}
