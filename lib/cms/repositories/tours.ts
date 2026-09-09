import "server-only";

import { ConflictError, NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import { slugify } from "@/schemas/common";
import type { TourInputParsed } from "@/schemas/tour";
import type { FilterCondition, ListOptions, Paginated } from "@/types/common";
import type { TourDifficulty, TourPackage } from "@/types/content";

import {
  buildListQuery,
  isPubliclyVisible,
  PUBLIC_STATUS_FILTER,
  resolvePublication,
} from "./base";
import type { WriteContext } from "./pages";

const SEARCH_FIELDS = ["name", "slug", "shortDescription"];

async function collection() {
  return (await getDatabase()).collection<TourPackage>("tours");
}

export interface TourListOptions extends ListOptions {
  destinationId?: string;
  difficulty?: TourDifficulty;
  featured?: boolean;
}

/**
 * Tour packages repository.
 *
 * The heaviest content model in the CMS, because a tour is what the client
 * actually sells: price, length, difficulty, what is and is not included, and
 * a day-by-day itinerary. Everything a customer compares before booking is a
 * structured field rather than prose, so a listing page can filter and sort on
 * it and a detail page can render a spec table.
 *
 * A tour references a destination by id and copies nothing from it, so renaming
 * a destination updates every tour at once. The price of that is a dangling
 * `destinationId` when a destination is deleted: resolve it with
 * `cms.destinations.get()` and handle null, because the CMS has no referential
 * integrity to lean on and will not pretend otherwise.
 */
export const tours = {
  async list(options?: TourListOptions): Promise<Paginated<TourPackage>> {
    const store = await collection();
    const query = buildListQuery(options, SEARCH_FIELDS);

    const where: FilterCondition[] = [...(query.where ?? [])];
    if (options?.destinationId) {
      where.push({
        field: "destinationId",
        op: "eq",
        value: options.destinationId,
      });
    }
    if (options?.difficulty) {
      where.push({ field: "difficulty", op: "eq", value: options.difficulty });
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

  async get(id: string): Promise<TourPackage | null> {
    return (await collection()).findById(id);
  },

  /** Frontend lookup. Drafts and not-yet-due scheduled tours return null. */
  async getBySlug(slug: string): Promise<TourPackage | null> {
    const found = await this.getBySlugIncludingDrafts(slug);
    return found && isPubliclyVisible(found) ? found : null;
  },

  /** Preview/admin lookup: ignores publication state. */
  async getBySlugIncludingDrafts(slug: string): Promise<TourPackage | null> {
    const store = await collection();
    return store.findOne({
      where: [{ field: "slug", op: "eq", value: slugify(slug) }],
    });
  },

  /** Published tours in display order — the listing page. */
  async getPublished(options?: TourListOptions): Promise<TourPackage[]> {
    const store = await collection();

    const where: FilterCondition[] = [PUBLIC_STATUS_FILTER];
    if (options?.destinationId) {
      where.push({
        field: "destinationId",
        op: "eq",
        value: options.destinationId,
      });
    }
    if (options?.difficulty) {
      where.push({ field: "difficulty", op: "eq", value: options.difficulty });
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

    const visible = candidates.filter((tour) => isPubliclyVisible(tour));
    return options?.perPage ? visible.slice(0, options.perPage) : visible;
  },

  /** The homepage set: featured, published, in order. */
  async getFeatured(limit = 6): Promise<TourPackage[]> {
    return this.getPublished({ featured: true, perPage: limit });
  },

  /** Published tours for one destination — the destination detail page. */
  async getByDestination(
    destinationId: string,
    limit?: number,
  ): Promise<TourPackage[]> {
    return this.getPublished({ destinationId, perPage: limit });
  },

  async count(options?: TourListOptions): Promise<number> {
    const store = await collection();
    return store.count(buildListQuery(options, SEARCH_FIELDS));
  },

  async create(input: TourInputParsed, ctx: WriteContext): Promise<TourPackage> {
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
    input: TourInputParsed,
    ctx: WriteContext,
  ): Promise<TourPackage> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Tour");

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

    if (!updated) throw new NotFoundError("Tour");
    return updated;
  },

  async setStatus(
    id: string,
    status: TourPackage["status"],
    ctx: WriteContext,
  ): Promise<TourPackage> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Tour");

    const updated = await store.update(id, {
      status,
      publishedAt: resolvePublication(status, null, existing.publishedAt),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Tour");
    return updated;
  },

  async trash(id: string, ctx: WriteContext): Promise<TourPackage> {
    return this.setStatus(id, "trash", ctx);
  },

  async delete(id: string): Promise<boolean> {
    return (await collection()).delete(id);
  },

  /**
   * Copies a tour as a draft. The itinerary and FAQ rows get fresh ids so the
   * copy can be edited without the original's rows moving with it.
   */
  async duplicate(id: string, ctx: WriteContext): Promise<TourPackage> {
    const store = await collection();
    const source = await store.findById(id);
    if (!source) throw new NotFoundError("Tour");

    return store.create({
      ...source,
      id: undefined,
      name: `${source.name} (copy)`,
      slug: await findFreeSlug(source.slug),
      status: "draft",
      publishedAt: null,
      featured: false,
      itinerary: source.itinerary.map((day) => ({ ...day, id: newRowId() })),
      faqs: source.faqs.map((faq) => ({ ...faq, id: newRowId() })),
      updatedBy: ctx.userId,
    } as Omit<TourPackage, "id" | "createdAt" | "updatedAt"> & { id?: string });
  },
};

/** The fields the form owns, shared by create and update. */
function fields(input: TourInputParsed) {
  return {
    name: input.name,
    slug: input.slug,
    shortDescription: input.shortDescription,
    description: input.description,
    featuredImage: input.featuredImage,
    gallery: input.gallery,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    currency: input.currency,
    priceNote: input.priceNote,
    durationDays: input.durationDays,
    durationNights: input.durationNights,
    difficulty: input.difficulty,
    groupSizeMin: input.groupSizeMin,
    groupSizeMax: input.groupSizeMax,
    maxAltitude: input.maxAltitude,
    destinationId: input.destinationId,
    activityIds: input.activityIds,
    // Renumbered on save so the stored days always read 1..n, whatever order
    // the editor dragged them into.
    itinerary: input.itinerary.map((day, index) => ({
      ...day,
      day: index + 1,
    })),
    inclusions: input.inclusions,
    exclusions: input.exclusions,
    highlights: input.highlights,
    faqs: input.faqs,
    bestSeason: input.bestSeason,
    featured: input.featured,
    order: input.order,
    status: input.status,
    seo: input.seo,
  };
}

function newRowId(): string {
  return crypto.randomUUID();
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
