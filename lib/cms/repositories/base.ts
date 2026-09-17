import "server-only";

import type {
  ContentRecord,
  ContentStatus,
  FilterCondition,
  ListOptions,
  QuerySpec,
} from "@/types/common";
import { DEFAULT_PER_PAGE, MAX_PER_PAGE } from "@/types/common";

/**
 * Helpers shared by every repository.
 *
 * Repositories are where CMS business rules live: status transitions, slug
 * uniqueness, publication windows. Adapters stay dumb (§24.6, §24.7).
 */

/** Translates admin list options into a storage-level query. */
export function buildListQuery(
  options: ListOptions | undefined,
  searchFields: string[],
): QuerySpec {
  const page = Math.max(1, options?.page ?? 1);
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, options?.perPage ?? DEFAULT_PER_PAGE));

  const where: FilterCondition[] = [];

  if (options?.status && options.status !== "any") {
    where.push({ field: "status", op: "eq", value: options.status });
  }

  for (const [field, value] of Object.entries(options?.filters ?? {})) {
    if (value === undefined || value === "") continue;
    where.push({
      field,
      op: Array.isArray(value) ? "in" : "eq",
      value,
    });
  }

  const search = options?.search?.trim()
    ? { term: options.search.trim(), fields: searchFields }
    : undefined;

  return {
    where: where.length ? where : undefined,
    search,
    sort: [
      {
        field: options?.sort || "updatedAt",
        direction: options?.order ?? "desc",
      },
    ],
    limit: perPage,
    offset: (page - 1) * perPage,
  };
}

/**
 * Is this record visible to an anonymous visitor right now?
 *
 * `scheduled` records become visible once their publication time passes, which
 * is what makes scheduling work without a cron job.
 */
export function isPubliclyVisible(
  record: Pick<ContentRecord, "status" | "publishedAt">,
  now: Date = new Date(),
): boolean {
  if (record.status === "published") return true;
  if (record.status !== "scheduled") return false;
  if (!record.publishedAt) return false;
  return Date.parse(record.publishedAt) <= now.getTime();
}

/**
 * The storage-level filter for "publicly visible".
 *
 * Adapters cannot express `(status = published) OR (status = scheduled AND
 * publishedAt <= now)` through the narrow QuerySpec contract, so public reads
 * fetch both statuses and filter the scheduled ones in `isPubliclyVisible`.
 * Result sets here are page-sized, so the cost is negligible.
 */
export const PUBLIC_STATUS_FILTER: FilterCondition = {
  field: "status",
  op: "in",
  value: ["published", "scheduled"] satisfies ContentStatus[],
};

/**
 * Applies status/publishedAt rules on save.
 *
 * - publishing for the first time stamps `publishedAt`
 * - moving back to draft keeps the old date, so re-publishing is idempotent
 * - scheduling requires a date, which the Zod schema already enforces
 */
export function resolvePublication(
  status: ContentStatus,
  requested: string | null,
  existing: string | null,
): string | null {
  if (status === "published") return requested ?? existing ?? new Date().toISOString();
  if (status === "scheduled") return requested ?? existing;
  return existing;
}

export function nowIso(): string {
  return new Date().toISOString();
}
