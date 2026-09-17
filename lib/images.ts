import type { FeaturedImageSet } from "@/types/content";

/**
 * Which image a layout should use, and the fallback order when it is missing.
 *
 * A record carries up to four shapes (see `FeaturedImageSet`). Every call site
 * asking "is there a banner? no, then a horizontal? no, then the normal one?"
 * would be the same ladder written eight times and wrong in two of them, so it
 * is written once here.
 *
 * Deliberately not `server-only`: cards render on the server and the lightbox
 * is a Client Component, and both need the same answer.
 */

/** The shapes a caller can ask for, widest to tallest. */
export type ImageShape = "banner" | "horizontal" | "normal" | "vertical";

/**
 * The design default for a banner. Not enforced anywhere — a client who
 * uploads 1600x600 gets 1600x600 — but it is the number the layout is built
 * around and the one the admin tells the editor to aim for.
 */
export const BANNER_DIMENSIONS = { width: 1920, height: 700 } as const;

/**
 * Fallback ladders, per shape.
 *
 * Each one degrades toward the normal image rather than toward nothing, so a
 * client who has filled in only `featuredImage` still gets a picture in every
 * slot. The vertical ladder is the exception that does not reach for the
 * banner: a 1920x700 crop in a portrait tile is a letterbox, and no image
 * reads better there than a bad one.
 */
const LADDERS: Record<ImageShape, (keyof FeaturedImageSet)[]> = {
  banner: ["bannerImage", "featuredImageHorizontal", "featuredImage"],
  horizontal: ["featuredImageHorizontal", "featuredImage", "bannerImage"],
  normal: ["featuredImage", "featuredImageHorizontal"],
  vertical: ["featuredImageVertical", "featuredImage", "featuredImageHorizontal"],
};

/** A partial record is accepted so a caller can pass a listing projection. */
type ImageSource = Partial<FeaturedImageSet> | null | undefined;

export function pickImage(record: ImageSource, shape: ImageShape = "normal"): string | null {
  if (!record) return null;

  for (const key of LADDERS[shape]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  // Last resort: the first gallery photograph. A record with eight pictures
  // and no featured image should not render as a grey box.
  const first = record.gallery?.find((url) => url.trim());
  return first ?? null;
}

/**
 * Whether a card grid should render this record as a portrait tile.
 *
 * The client's rule, and the reason `featuredImageVertical` is a field rather
 * than a crop: setting a vertical image is how an editor says "this one is a
 * tall card". A grid asks every record and switches only when told to.
 */
export function prefersVerticalCard(record: ImageSource): boolean {
  return Boolean(record?.featuredImageVertical?.trim());
}

/**
 * The aspect ratio to reserve for a shape, as a CSS `aspect-ratio` value.
 *
 * Kept beside the ladders because the two have to agree: a slot that falls
 * back from vertical to the normal image still reserves portrait space, and a
 * mismatch here is what makes a grid jump as images load.
 */
export const SHAPE_RATIO: Record<ImageShape, string> = {
  banner: "1920 / 700",
  horizontal: "16 / 9",
  normal: "4 / 3",
  vertical: "3 / 4",
};
