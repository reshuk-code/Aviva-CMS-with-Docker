import "server-only";

import { NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import type { FaqInputParsed } from "@/schemas/faq";
import type { FilterCondition, ListOptions, Paginated } from "@/types/common";
import type { Faq } from "@/types/content";

import {
  buildListQuery,
  isPubliclyVisible,
  PUBLIC_STATUS_FILTER,
  resolvePublication,
} from "./base";
import type { WriteContext } from "./pages";

const SEARCH_FIELDS = ["question", "answer", "category"];

/** Ceiling for the category scan. See the note on `media.folders()`. */
const FACET_SCAN_LIMIT = 2000;

async function collection() {
  return (await getDatabase()).collection<Faq>("faqs");
}

export interface FaqListOptions extends ListOptions {
  category?: string;
}

/**
 * FAQs repository.
 *
 * The simplest content type in the CMS: a question, an answer, a category and
 * a position. It earns its own module rather than living as rich text on a
 * page because the answers get rendered in three places — the FAQ page, a tour
 * detail accordion, and JSON-LD — and prose can only be rendered in one.
 *
 * Categories are strings on the record, derived into a facet by `categories()`,
 * for the same reason blog categories are.
 */
export const faqs = {
  async list(options?: FaqListOptions): Promise<Paginated<Faq>> {
    const store = await collection();
    const query = buildListQuery(options, SEARCH_FIELDS);

    const where: FilterCondition[] = [...(query.where ?? [])];
    if (options?.category) {
      where.push({ field: "category", op: "eq", value: options.category });
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

  async get(id: string): Promise<Faq | null> {
    return (await collection()).findById(id);
  },

  /** Published FAQs in display order — the FAQ page. */
  async getPublished(options?: FaqListOptions): Promise<Faq[]> {
    const store = await collection();

    const where: FilterCondition[] = [PUBLIC_STATUS_FILTER];
    if (options?.category) {
      where.push({ field: "category", op: "eq", value: options.category });
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

  /**
   * Published FAQs grouped by category, categories in alphabetical order and
   * uncategorised last — the shape an FAQ page with section headings needs.
   */
  async getGrouped(): Promise<{ category: string | null; items: Faq[] }[]> {
    const published = await this.getPublished();

    const groups = new Map<string, Faq[]>();
    const uncategorised: Faq[] = [];

    for (const record of published) {
      if (!record.category) {
        uncategorised.push(record);
        continue;
      }
      const bucket = groups.get(record.category);
      if (bucket) bucket.push(record);
      else groups.set(record.category, [record]);
    }

    const sorted = [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, items]) => ({ category: category as string | null, items }));

    if (uncategorised.length) {
      sorted.push({ category: null, items: uncategorised });
    }

    return sorted;
  },

  async count(options?: FaqListOptions): Promise<number> {
    const store = await collection();
    return store.count(buildListQuery(options, SEARCH_FIELDS));
  },

  /** Categories in use, for the filter dropdown and the editor's datalist. */
  async categories(): Promise<string[]> {
    const store = await collection();
    const all = await store.findMany({
      where: [{ field: "status", op: "ne", value: "trash" }],
      limit: FACET_SCAN_LIMIT,
    });

    const names = new Set<string>();
    for (const record of all) {
      if (record.category) names.add(record.category);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  },

  async create(input: FaqInputParsed, ctx: WriteContext): Promise<Faq> {
    const store = await collection();

    return store.create({
      ...fields(input),
      publishedAt: resolvePublication(input.status, input.publishedAt, null),
      updatedBy: ctx.userId,
    });
  },

  async update(
    id: string,
    input: FaqInputParsed,
    ctx: WriteContext,
  ): Promise<Faq> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("FAQ");

    const updated = await store.update(id, {
      ...fields(input),
      publishedAt: resolvePublication(
        input.status,
        input.publishedAt,
        existing.publishedAt,
      ),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("FAQ");
    return updated;
  },

  async setStatus(
    id: string,
    status: Faq["status"],
    ctx: WriteContext,
  ): Promise<Faq> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("FAQ");

    const updated = await store.update(id, {
      status,
      publishedAt: resolvePublication(status, null, existing.publishedAt),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("FAQ");
    return updated;
  },

  async trash(id: string, ctx: WriteContext): Promise<Faq> {
    return this.setStatus(id, "trash", ctx);
  },

  async delete(id: string): Promise<boolean> {
    return (await collection()).delete(id);
  },

  async duplicate(id: string, ctx: WriteContext): Promise<Faq> {
    const store = await collection();
    const source = await store.findById(id);
    if (!source) throw new NotFoundError("FAQ");

    return store.create({
      ...source,
      id: undefined,
      question: `${source.question} (copy)`,
      status: "draft",
      publishedAt: null,
      updatedBy: ctx.userId,
    } as Omit<Faq, "id" | "createdAt" | "updatedAt"> & { id?: string });
  },
};

/** The fields the form owns, shared by create and update. */
function fields(input: FaqInputParsed) {
  return {
    question: input.question,
    answer: input.answer,
    category: input.category,
    order: input.order,
    status: input.status,
  };
}
