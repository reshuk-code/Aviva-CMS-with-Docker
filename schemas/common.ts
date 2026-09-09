import { z } from "zod";

import { CONTENT_STATUSES, DEFAULT_PER_PAGE } from "@/types/common";

/**
 * Shared Zod pieces. Every mutation that crosses a trust boundary (server
 * action, route handler) parses its input with one of these before touching
 * an adapter — see docs/ARCHITECTURE.md, "Validation".
 */
export const idSchema = z.string().min(1, "Missing id.");

export const contentStatusSchema = z.enum(CONTENT_STATUSES);

/** Trims and coerces "" to null, which is how the CMS stores empty fields. */
export const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .default(null);

/**
 * A number field that may be left blank.
 *
 * Accepts what each source actually sends: `""` from an empty text input, a
 * number from a JSON payload such as the itinerary editor, and `null` from a
 * record that was stored with the field empty. All three mean "no value".
 */
export const optionalNumber = z
  .union([z.string(), z.number(), z.null()])
  .default("")
  .transform((value) => {
    if (value === null) return null;
    const trimmed = typeof value === "number" ? value : value.trim();
    return trimmed === "" ? null : Number(trimmed);
  })
  .refine(
    (value) => value === null || Number.isFinite(value),
    "Enter a number, or leave this blank.",
  );

export const optionalUrl = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .nullable()
  .default(null)
  .refine(
    (value) =>
      value === null ||
      value.startsWith("/") ||
      /^https?:\/\//i.test(value) ||
      value.startsWith("#"),
    "Must be a site-relative path (/about) or an http(s) URL.",
  );

/**
 * Normalises any user input into a CMS slug: lowercase, hyphenated, always
 * leading-slashed, never trailing-slashed. "/" stays "/" (the home page).
 */
export function normaliseSlug(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    // Keep path separators; drop anything that is not URL-friendly.
    .replace(/[^a-z0-9\-/]/g, "")
    .replace(/-+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/(^-|-$)/g, "");

  const withLeadingSlash = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  const trimmed = withLeadingSlash.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Derives a slug from a title when the editor leaves the slug blank. */
export function slugify(input: string): string {
  return normaliseSlug(input).replace(/^\//, "") || "untitled";
}

export const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .transform(normaliseSlug);

/**
 * A slug with no leading slash, for content that is not addressed by a path of
 * its own — a blog post lives under whatever route the developer gives it
 * (`app/blog/[slug]`), so storing "/annapurna" would bake in an assumption the
 * CMS has no right to make.
 */
export const bareSlugSchema = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .transform(slugify);

/** Query-string parameters accepted by every admin list view. */
export const listOptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(DEFAULT_PER_PAGE),
  search: z.string().trim().default(""),
  status: z.union([contentStatusSchema, z.literal("any")]).default("any"),
  sort: z.string().trim().default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ListOptionsInput = z.input<typeof listOptionsSchema>;
