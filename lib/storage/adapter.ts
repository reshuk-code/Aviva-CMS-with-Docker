/**
 * The storage contract for the media library.
 *
 * Kept separate from the database adapter on purpose: plenty of projects want
 * Supabase Postgres with S3 media, or Mongo with local files. The two are
 * configured independently in cms.config.ts (§10).
 */
export interface StoredFile {
  /** Path within the bucket. The stable identifier for the file. */
  key: string;
  /** Public URL for rendering. May be signed for private buckets. */
  url: string;
  size: number;
  mimeType: string;
}

export interface UploadInput {
  /** Original filename; the adapter derives a safe, unique key from it. */
  filename: string;
  mimeType: string;
  body: Buffer | Uint8Array | ArrayBuffer;
  /** Optional single-level folder, e.g. "tours". */
  folder?: string | null;
}

export interface StorageAdapter {
  readonly provider: string;
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<boolean>;
  /** Resolves a key to a URL. Signed adapters may return a short-lived one. */
  getUrl(key: string): Promise<string>;
  /** Maximum accepted upload size in bytes. */
  readonly maxUploadBytes: number;
}

/** Turns a filename into a collision-free, URL-safe storage key. */
export function buildStorageKey(
  filename: string,
  folder?: string | null,
): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  const extension = dot > 0 ? filename.slice(dot + 1).toLowerCase() : "";

  const safeStem =
    stem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "file";

  const safeExtension = extension.replace(/[^a-z0-9]/g, "").slice(0, 10);
  const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const name = safeExtension
    ? `${safeStem}-${unique}.${safeExtension}`
    : `${safeStem}-${unique}`;

  const safeFolder = folder
    ? folder.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/(^-|-$)/g, "")
    : "";

  return safeFolder ? `${safeFolder}/${name}` : name;
}

/** Mime type to the coarse kind shown in the media library filters. */
export function mediaKindFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("video/")) return "video" as const;
  if (mimeType.startsWith("audio/")) return "audio" as const;
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("word") ||
    mimeType.includes("sheet") ||
    mimeType.startsWith("text/")
  ) {
    return "document" as const;
  }
  return "other" as const;
}
