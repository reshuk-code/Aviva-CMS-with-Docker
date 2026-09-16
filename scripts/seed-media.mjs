/**
 * Turns the photograph manifest into media library records.
 *
 * Kept out of the runner so the picture library can be re-fetched and checked
 * on its own, without the seeder standing ready to overwrite the database.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT =
  "aviva-cms-seed/1.0 (Next.js CMS starter; local development seeding)";

/** Wide enough for a full-bleed hero without downloading 8000px originals. */
const IMAGE_WIDTH = 1600;

/**
 * A stable UUID for a seeded record.
 *
 * Shaped as a v5 UUID so it satisfies the same `z.uuid()` checks a generated id
 * does — the admin validates ids taken out of URLs, and a bare hash would be
 * rejected there while working perfectly everywhere else.
 *
 * Deriving ids from slugs rather than generating them means re-running the
 * seeder updates the same records instead of duplicating them, and lets a
 * tour's `destinationId` be written directly without a lookup pass.
 */
export function stableId(seed) {
  const bytes = createHash("sha1")
    .update(`aviva-cms-seed:${seed}`)
    .digest()
    .subarray(0, 16);

  const uuid = Buffer.from(bytes);
  uuid[6] = (uuid[6] & 0x0f) | 0x50;
  uuid[8] = (uuid[8] & 0x3f) | 0x80;

  const hex = uuid.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/**
 * Pixel size read from the JPEG's own frame header.
 *
 * Not taken from the API: `iiurlwidth` is a request, not a promise, and
 * Commons answers it with the nearest thumbnail it already has — ask for 1600
 * and you are served 1920 while the response still says 1600. Storing the
 * number it claims would put a wrong size on every item in the media library.
 *
 * This walks JPEG segments to the start-of-frame marker and reads the two
 * 16-bit fields there. It is not an image decoder and it is not in the app;
 * every downloaded file is a JPEG thumbnail from one source.
 */
function jpegSize(buffer) {
  let offset = 2; // Skip the SOI marker.

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      // C4 is a Huffman table, C8 is reserved, CC is arithmetic coding — all
      // sit inside the SOF range without being frame headers.
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += 2 + buffer.readUInt16BE(offset + 2);
  }

  return { width: null, height: null };
}

/** Strips the HTML Commons wraps around its metadata fields. */
function plain(field) {
  return (field?.value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Commons caps a titles query at 50; this manifest is comfortably under. */
async function fetchCommonsMetadata(titles) {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(IMAGE_WIDTH),
  }).toString();

  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Commons API returned ${response.status}.`);
  }

  const payload = await response.json();
  const byTitle = new Map();

  for (const page of payload?.query?.pages ?? []) {
    if (page.missing || !page.imageinfo?.[0]) continue;
    byTitle.set(page.title, page.imageinfo[0]);
  }

  // Commons normalises titles (underscores, capitalisation) before answering,
  // so map the manifest's spelling onto whatever came back.
  for (const { from, to } of payload?.query?.normalized ?? []) {
    if (byTitle.has(to)) byTitle.set(from, byTitle.get(to));
  }

  return byTitle;
}

/**
 * Downloads every photograph and returns media records keyed by manifest name.
 *
 * A file already on disk is not fetched again, so re-seeding is fast and works
 * offline once the library is populated. The metadata request still runs: it is
 * one call for the whole manifest, and it carries the attribution.
 */
export async function fetchImages(images, uploadRoot, authorId, now) {
  const metadata = await fetchCommonsMetadata(images.map((i) => i.commons));
  const media = new Map();

  for (const image of images) {
    const info = metadata.get(image.commons);
    if (!info) {
      throw new Error(
        `Wikimedia Commons has no file "${image.commons}". ` +
          "Fix the title in scripts/seed-images.mjs.",
      );
    }

    const filename = `${image.name}.jpg`;
    const key = `${image.folder}/${filename}`;
    const target = path.join(uploadRoot, image.folder, filename);

    let body;
    if (existsSync(target)) {
      body = await readFile(target);
      process.stdout.write(`  = ${key}\n`);
    } else {
      const response = await fetch(info.thumburl, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!response.ok) {
        throw new Error(`Could not download ${key}: HTTP ${response.status}.`);
      }
      body = Buffer.from(await response.arrayBuffer());
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
      process.stdout.write(
        `  + ${key} (${Math.round(body.byteLength / 1024)} KB)\n`,
      );
    }

    const { width, height } = jpegSize(body);

    const artist = plain(info.extmetadata?.Artist) || "Unknown photographer";
    const licence = plain(info.extmetadata?.LicenseShortName) || "see source";

    media.set(image.name, {
      id: stableId(`media:${image.name}`),
      key,
      url: `/uploads/${key}`,
      filename,
      mimeType: "image/jpeg",
      kind: "image",
      size: body.byteLength,
      width,
      height,
      altText: image.alt,
      caption: image.caption,
      description:
        `Photograph by ${artist}, via Wikimedia Commons (${licence}). ` +
        `Source: ${info.descriptionurl}`,
      folder: image.folder,
      uploadedBy: authorId,
      createdAt: now,
      updatedAt: now,
    });
  }

  return media;
}
