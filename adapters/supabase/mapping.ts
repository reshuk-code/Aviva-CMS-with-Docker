import type { BaseRecord } from "@/types/common";

/**
 * Row <-> record translation for the Postgres-shaped adapters.
 *
 * Shared by the Supabase and Neon adapters: they talk to Postgres very
 * differently (PostgREST versus SQL over HTTP) but store data identically, so
 * the mapping and the field-to-column rules belong in one place.
 */
export interface Row {
  id: string;
  slug: string | null;
  status: string | null;
  /**
   * PostgREST returns timestamps as ISO strings; the Neon driver returns Date
   * objects. Both are accepted and normalised to a string by `toRecord`.
   */
  created_at: string | Date;
  updated_at: string | Date;
  data: Record<string, unknown>;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

/** Fields stored as real columns rather than inside `data`. */
export const PROMOTED_FIELDS = new Set([
  "id",
  "slug",
  "status",
  "createdAt",
  "updatedAt",
]);

/** The promoted columns, by CMS field name. Shared by both dialects. */
const PROMOTED_COLUMN: Record<string, string> = {
  id: "id",
  slug: "slug",
  status: "status",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

/**
 * Maps a CMS field path to a **PostgREST** column expression.
 *
 * PostgREST has its own filter grammar in which jsonb keys are written bare:
 * `data->>title`. That is NOT valid SQL — see `sqlColumnFor` below. The two
 * dialects looked interchangeable and are not; conflating them produced a
 * `column "title" does not exist` error that only appeared when sorting on a
 * field inside `data`.
 */
export function columnFor(field: string): string {
  const promoted = PROMOTED_COLUMN[field];
  if (promoted) return promoted;

  if (field.includes(".")) {
    const parts = field.split(".");
    const last = parts.pop() as string;
    return `data->${parts.join("->")}->>${last}`;
  }
  return `data->>${field}`;
}

/**
 * Maps a CMS field path to a **plain SQL** column expression.
 *
 * jsonb keys must be quoted string literals: `data->>'title'`, and for a
 * nested path `data->'seo'->>'title'`.
 *
 * Callers must pass the field through `assertSafeField` first, which rejects
 * anything but `[A-Za-z0-9_]` and dots — so a key can never contain a quote
 * and cannot break out of the literal.
 */
export function sqlColumnFor(field: string): string {
  const promoted = PROMOTED_COLUMN[field];
  if (promoted) return promoted;

  const parts = field.split(".");
  const last = parts.pop() as string;

  if (parts.length === 0) return `data->>'${last}'`;
  return `data->${parts.map((part) => `'${part}'`).join("->")}->>'${last}'`;
}

/**
 * Rejects anything that is not a plain field path.
 *
 * Field names reach the adapters from repository code, not from request input,
 * but a query builder that interpolates identifiers deserves a guard rather
 * than an assumption about its callers.
 */
export function assertSafeField(field: string): void {
  if (!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/.test(field)) {
    throw new Error(`Unsafe field name in query: ${field}`);
  }
}

export function toRecord<T extends BaseRecord>(row: Row): T {
  return {
    ...row.data,
    id: row.id,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    ...(row.slug !== null ? { slug: row.slug } : {}),
    ...(row.status !== null ? { status: row.status } : {}),
  } as T;
}

export function toRow(record: Record<string, unknown>): Partial<Row> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!PROMOTED_FIELDS.has(key)) data[key] = value;
  }

  const row: Partial<Row> = { data };
  if (typeof record.id === "string") row.id = record.id;
  if (typeof record.slug === "string") row.slug = record.slug;
  if (typeof record.status === "string") row.status = record.status;
  return row;
}
