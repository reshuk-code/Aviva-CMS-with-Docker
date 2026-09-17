/**
 * Every picture and video a record references, wherever it was put.
 *
 * A tour's media is scattered: two or three featured slots, the gallery, a
 * photograph on each itinerary day, and anything dropped into one of the six
 * rich text editors. An editor asking "which images is this trip using?" had
 * no way to answer but to open every tab, so the Images panel answers it.
 *
 * The scan is deliberately structure-blind. It takes the form's values, parses
 * anything that looks like JSON, and keeps every string that looks like a
 * media address — rather than knowing that `itinerary[n].images` exists and
 * that a rich text image hangs off `attrs.src`. A structure-aware version
 * needs editing every time a field is added, and fails silently when nobody
 * remembers to; this one picks up a new field the day it lands.
 *
 * The cost of that choice is honest: a string that merely looks like an image
 * URL is collected even if it is, say, a canonical link. That shows a spare
 * thumbnail in a read-only panel, which is a far cheaper mistake than
 * quietly missing half the gallery.
 */

/** Addresses worth showing. Extension-led, because that is all a URL tells us. */
const MEDIA_URL =
  /^(https?:\/\/|\/)\S*\.(png|jpe?g|gif|webp|avif|svg|mp4|webm|ogg|mov|m4v)(\?\S*)?$/i;

/** Depth bound, so a crafted or corrupt value cannot spin the scan. */
const MAX_DEPTH = 32;

export type UsedMediaKind = "image" | "video";

export interface UsedMedia {
  url: string;
  kind: UsedMediaKind;
}

const VIDEO_EXTENSION = /\.(mp4|webm|ogg|mov|m4v)(\?\S*)?$/i;

function collectFrom(value: unknown, into: Set<string>, depth: number): void {
  if (depth > MAX_DEPTH) return;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (MEDIA_URL.test(trimmed)) {
      into.add(trimmed);
      return;
    }

    // A serialised rich text document, or the itinerary's JSON payload. Both
    // arrive as one form value and both hide media several levels down.
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        collectFrom(JSON.parse(trimmed), into, depth + 1);
      } catch {
        // Not JSON after all. Nothing to collect, and nothing to report: a
        // half-typed value in a text field is not an error worth surfacing.
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const entry of value) collectFrom(entry, into, depth + 1);
    return;
  }

  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      collectFrom(entry, into, depth + 1);
    }
  }
}

/**
 * The media referenced by a set of form values, in the order first seen.
 *
 * Order matters a little: the featured slots are posted before the gallery and
 * the body, so the panel opens with the pictures the editor most recently
 * chose rather than with whatever sorts first.
 */
export function collectUsedMedia(values: Iterable<unknown>): UsedMedia[] {
  const urls = new Set<string>();
  for (const value of values) collectFrom(value, urls, 0);

  return [...urls].map((url) => ({
    url,
    kind: VIDEO_EXTENSION.test(url) ? "video" : "image",
  }));
}
