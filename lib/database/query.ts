/**
 * In-memory query execution shared by adapters that cannot push filtering
 * down to the storage engine (the local JSON adapter today, and the fallback
 * paths of other adapters).
 *
 * Keeping this here rather than in one adapter means all adapters agree on
 * what `contains` or a multi-field `search` means.
 */
import type {
  FilterCondition,
  Paginated,
  QuerySpec,
  SortSpec,
} from "@/types/common";

function readPath(record: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      record,
    );
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

export function matchesCondition(
  record: unknown,
  condition: FilterCondition,
): boolean {
  const actual = readPath(record, condition.field);
  const expected = condition.value;

  switch (condition.op) {
    case "eq":
      return Array.isArray(actual)
        ? actual.includes(expected)
        : actual === expected;
    case "ne":
      return actual !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(actual as never);
    case "lt":
      return compare(actual, expected) < 0;
    case "lte":
      return compare(actual, expected) <= 0;
    case "gt":
      return compare(actual, expected) > 0;
    case "gte":
      return compare(actual, expected) >= 0;
    case "contains":
      if (Array.isArray(actual)) return actual.includes(expected as never);
      return String(actual ?? "")
        .toLowerCase()
        .includes(String(expected ?? "").toLowerCase());
    default:
      return true;
  }
}

export function matchesSearch(
  record: unknown,
  search: NonNullable<QuerySpec["search"]>,
): boolean {
  const term = search.term.trim().toLowerCase();
  if (!term) return true;
  return search.fields.some((field) =>
    String(readPath(record, field) ?? "")
      .toLowerCase()
      .includes(term),
  );
}

export function applySort<T>(records: T[], sort: SortSpec[] | undefined): T[] {
  if (!sort?.length) return records;
  return [...records].sort((a, b) => {
    for (const { field, direction } of sort) {
      const result = compare(readPath(a, field), readPath(b, field));
      if (result !== 0) return direction === "desc" ? -result : result;
    }
    return 0;
  });
}

export function applyFilters<T>(records: T[], query?: QuerySpec): T[] {
  if (!query) return records;
  let result = records;
  if (query.where?.length) {
    result = result.filter((record) =>
      query.where!.every((condition) => matchesCondition(record, condition)),
    );
  }
  if (query.search) {
    result = result.filter((record) => matchesSearch(record, query.search!));
  }
  return applySort(result, query.sort);
}

/** Filter, sort, then slice — the full pipeline used by `list()`. */
export function paginate<T>(records: T[], query?: QuerySpec): Paginated<T> {
  const filtered = applyFilters(records, query);
  const limit = query?.limit ?? filtered.length ?? 0;
  const offset = query?.offset ?? 0;
  const perPage = limit > 0 ? limit : Math.max(filtered.length, 1);

  return {
    items: limit > 0 ? filtered.slice(offset, offset + limit) : filtered,
    total: filtered.length,
    page: Math.floor(offset / perPage) + 1,
    perPage,
    totalPages: Math.max(1, Math.ceil(filtered.length / perPage)),
  };
}
