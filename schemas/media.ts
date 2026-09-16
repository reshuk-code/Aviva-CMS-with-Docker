import { z } from "zod";

import { MEDIA_KINDS } from "@/types/content";

import { optionalText } from "./common";

/**
 * Media validation.
 *
 * The file itself is validated by the storage adapter, which enforces a size
 * limit only: the library deliberately accepts documents, audio and video as
 * well as images (see MEDIA_KINDS), so there is no type allowlist here. The
 * editor's own upload path is the exception and accepts images alone.
 * These schemas cover the metadata a person types.
 */
export const mediaKindSchema = z.enum(MEDIA_KINDS);

/**
 * Folders are a single flat level — "tours", "team" — not a tree.
 *
 * A tree needs move/rename/merge semantics across two backends and a storage
 * provider, and clients asked for "somewhere to put the trek photos". One
 * level buys most of the tidiness for none of that cost.
 *
 * Not to be confused with the dated path in the storage key
 * (`2026/09/13/…`, see `buildStorageKey`). That organises the bucket; this
 * organises the library. A file has both, and they are set independently.
 */
export const folderSchema = z
  .string()
  .trim()
  .transform((value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40),
  )
  .transform((value) => (value.length ? value : null))
  .nullable()
  .default(null);

/** The metadata form on a media item. The file is never replaced in place. */
export const mediaUpdateSchema = z.object({
  altText: optionalText,
  caption: optionalText,
  description: optionalText,
  folder: folderSchema,
});

export type MediaUpdateInput = z.infer<typeof mediaUpdateSchema>;

/** Fields accepted alongside an upload. */
export const mediaUploadSchema = z.object({
  folder: folderSchema,
  altText: optionalText,
});

/** Query-string parameters for the media library and the picker. */
export const mediaListOptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().default(""),
  kind: z.union([mediaKindSchema, z.literal("any")]).default("any"),
  /** "" means every folder; "root" means only files outside a folder. */
  folder: z.string().trim().default(""),
  sort: z.string().trim().default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type MediaListOptionsInput = z.input<typeof mediaListOptionsSchema>;
