import "server-only";

import { NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import type { TestimonialInputParsed } from "@/schemas/testimonial";
import type { FilterCondition, ListOptions, Paginated } from "@/types/common";
import type { Testimonial } from "@/types/content";

import {
  buildListQuery,
  isPubliclyVisible,
  PUBLIC_STATUS_FILTER,
  resolvePublication,
} from "./base";
import type { WriteContext } from "./pages";

const SEARCH_FIELDS = ["name", "message", "company", "country"];

/** Ceiling for the unpaginated scans. See the note on `media.folders()`. */
const FACET_SCAN_LIMIT = 2000;

async function collection() {
  return (await getDatabase()).collection<Testimonial>("testimonials");
}

export interface TestimonialListOptions extends ListOptions {
  rating?: number;
  featured?: boolean;
  tourId?: string;
}

/**
 * Testimonials repository.
 *
 * The only published content type with no slug: a review is a quote rendered
 * inside someone else's page, never a page of its own, so there is no URL to
 * keep unique and no SEO block to carry.
 *
 * It still has the full draft/schedule/trash lifecycle, because "we are not
 * showing that one any more" is a thing clients ask for constantly and
 * deleting the record loses the evidence that the review existed.
 */
export const testimonials = {
  async list(
    options?: TestimonialListOptions,
  ): Promise<Paginated<Testimonial>> {
    const store = await collection();
    const query = buildListQuery(options, SEARCH_FIELDS);

    const where: FilterCondition[] = [...(query.where ?? [])];
    if (options?.rating !== undefined) {
      where.push({ field: "rating", op: "eq", value: options.rating });
    }
    if (options?.featured !== undefined) {
      where.push({ field: "featured", op: "eq", value: options.featured });
    }
    if (options?.tourId) {
      where.push({ field: "tourId", op: "eq", value: options.tourId });
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

  async get(id: string): Promise<Testimonial | null> {
    return (await collection()).findById(id);
  },

  /** Published testimonials in display order — the reviews section. */
  async getPublished(
    options?: TestimonialListOptions,
  ): Promise<Testimonial[]> {
    const store = await collection();

    const where: FilterCondition[] = [PUBLIC_STATUS_FILTER];
    if (options?.featured !== undefined) {
      where.push({ field: "featured", op: "eq", value: options.featured });
    }
    if (options?.tourId) {
      where.push({ field: "tourId", op: "eq", value: options.tourId });
    }
    if (options?.rating !== undefined) {
      where.push({ field: "rating", op: "eq", value: options.rating });
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
  async getFeatured(limit = 6): Promise<Testimonial[]> {
    return this.getPublished({ featured: true, perPage: limit });
  },

  /** Published reviews for one tour — the tour detail page. */
  async getByTour(tourId: string, limit?: number): Promise<Testimonial[]> {
    return this.getPublished({ tourId, perPage: limit });
  },

  async count(options?: TestimonialListOptions): Promise<number> {
    const store = await collection();
    return store.count(buildListQuery(options, SEARCH_FIELDS));
  },

  /**
   * Average rating across published reviews, and how many there were.
   *
   * Returned together because the average alone is a number a site should not
   * print: "4.8" from two reviews and "4.8" from two hundred are different
   * claims, and the frontend needs the count to say which it has.
   */
  async ratingSummary(): Promise<{ average: number | null; count: number }> {
    const published = await this.getPublished();
    if (published.length === 0) return { average: null, count: 0 };

    const total = published.reduce((sum, record) => sum + record.rating, 0);
    return {
      average: Math.round((total / published.length) * 10) / 10,
      count: published.length,
    };
  },

  async create(
    input: TestimonialInputParsed,
    ctx: WriteContext,
  ): Promise<Testimonial> {
    const store = await collection();

    return store.create({
      ...fields(input),
      publishedAt: resolvePublication(input.status, input.publishedAt, null),
      updatedBy: ctx.userId,
    });
  },

  async update(
    id: string,
    input: TestimonialInputParsed,
    ctx: WriteContext,
  ): Promise<Testimonial> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Testimonial");

    const updated = await store.update(id, {
      ...fields(input),
      publishedAt: resolvePublication(
        input.status,
        input.publishedAt,
        existing.publishedAt,
      ),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Testimonial");
    return updated;
  },

  async setStatus(
    id: string,
    status: Testimonial["status"],
    ctx: WriteContext,
  ): Promise<Testimonial> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Testimonial");

    const updated = await store.update(id, {
      status,
      publishedAt: resolvePublication(status, null, existing.publishedAt),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Testimonial");
    return updated;
  },

  async trash(id: string, ctx: WriteContext): Promise<Testimonial> {
    return this.setStatus(id, "trash", ctx);
  },

  async delete(id: string): Promise<boolean> {
    return (await collection()).delete(id);
  },

  async duplicate(id: string, ctx: WriteContext): Promise<Testimonial> {
    const store = await collection();
    const source = await store.findById(id);
    if (!source) throw new NotFoundError("Testimonial");

    return store.create({
      ...source,
      id: undefined,
      name: `${source.name} (copy)`,
      status: "draft",
      publishedAt: null,
      featured: false,
      updatedBy: ctx.userId,
    } as Omit<Testimonial, "id" | "createdAt" | "updatedAt"> & { id?: string });
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
};

/** The fields the form owns, shared by create and update. */
function fields(input: TestimonialInputParsed) {
  return {
    name: input.name,
    image: input.image,
    rating: input.rating,
    message: input.message,
    position: input.position,
    company: input.company,
    country: input.country,
    tourId: input.tourId,
    featured: input.featured,
    order: input.order,
    status: input.status,
  };
}
