/**
 * The contract for dragging a file out of the media drawer.
 *
 * One module because five components have to agree on it: the drawer writes
 * the payload, and the image field, the gallery field and the rich text editor
 * all read it. Written twice, they drift.
 *
 * `text/uri-list` is written alongside the private type so a drag that lands
 * somewhere the CMS does not control — another tab, a desktop app — still
 * carries a usable address rather than nothing.
 */
export const MEDIA_DRAG_TYPE = "application/x-cms-media";

export interface MediaDragPayload {
  url: string;
  alt: string;
}

export function setMediaDragData(
  dataTransfer: DataTransfer,
  payload: MediaDragPayload,
): void {
  dataTransfer.setData(MEDIA_DRAG_TYPE, JSON.stringify(payload));
  dataTransfer.setData("text/uri-list", payload.url);
  dataTransfer.setData("text/plain", payload.url);
  dataTransfer.effectAllowed = "copy";
}

/**
 * Whether a drag in progress is one of ours.
 *
 * Checks `types` rather than reading the payload because during `dragover` the
 * browser refuses `getData()` — the data is only readable on `drop`. A hover
 * highlight that tried to read the payload would silently never light up.
 */
export function hasMediaDrag(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false;
  return (
    dataTransfer.types.includes(MEDIA_DRAG_TYPE) ||
    dataTransfer.types.includes("text/uri-list")
  );
}

/** Reads the payload on drop. Null when the drag carried nothing usable. */
export function readMediaDragData(
  dataTransfer: DataTransfer | null,
): MediaDragPayload | null {
  if (!dataTransfer) return null;

  const raw = dataTransfer.getData(MEDIA_DRAG_TYPE);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        typeof (parsed as MediaDragPayload).url === "string"
      ) {
        const payload = parsed as MediaDragPayload;
        return {
          url: payload.url,
          alt: typeof payload.alt === "string" ? payload.alt : "",
        };
      }
    } catch {
      // Fall through to the uri-list below rather than losing the drop.
    }
  }

  // A uri-list is newline separated and may carry comment lines.
  const list = dataTransfer.getData("text/uri-list");
  const first = list
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("#"));

  return first ? { url: first, alt: "" } : null;
}
