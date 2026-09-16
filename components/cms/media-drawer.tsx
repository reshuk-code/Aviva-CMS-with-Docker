"use client";

import { ImagePlus, Search, X } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import { MediaThumb } from "@/components/cms/media-thumb";
import { setMediaDragData } from "@/components/cms/media-drag";
import { useMediaLibrary } from "@/components/cms/use-media-library";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { formatBytes } from "@/lib/utils";

/**
 * The media library, docked beside a content editor.
 *
 * The picker dialog answers "fill this one field"; this answers "I am writing a
 * page and will place several images". It stays open while you work and images
 * are dragged out of it into the featured image, a gallery or the text editor.
 *
 * An overlay rather than a third column: the editors are already a two-column
 * grid with a full rail of publishing controls, and a permanent third column
 * squeezes the form below roughly 1600px even when nobody is placing an image.
 *
 * Read-only, like the picker. Uploading stays at /admin/media so one place
 * enforces folders, alt text and the size limit — except for a file dropped
 * straight into the editor, which has nowhere else to go.
 */
/**
 * The drawer plus its own toggle.
 *
 * It owns the open state so a form mounts the whole feature with one element.
 * The alternative was threading state from each editor's page, which is a
 * Server Component — four files changed to hold one boolean.
 */
export function MediaLibraryPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="w-full"
      >
        <ImagePlus className="size-4" />
        Media library
      </Button>

      <MediaDrawer open={open} onOpenChange={setOpen} />
    </>
  );
}

export function MediaDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const library = useMediaLibrary({ active: open, kind: "image", perPage: 40 });

  if (!open) return null;

  /*
   * Portalled to the body, and it has to be.
   *
   * The panel is mounted by `MediaLibraryPanel` wherever the button sits,
   * which is inside the editor's publishing rail — and that rail is
   * `position: sticky`. A sticky element creates a stacking context even at
   * `z-index: auto`, so `z-40` here was only ever competing with its siblings
   * inside that rail, never with the admin header at `z-30` in the root
   * context. The header therefore painted over the top of the drawer, and
   * raising the number would have changed nothing.
   *
   * No `mounted` guard is needed: this returns null until `open`, and `open`
   * only becomes true from a click, so `document` always exists by the time
   * the portal is created.
   */
  return createPortal(
    <aside
      aria-label="Media library"
      className="fixed inset-y-0 right-0 z-40 flex w-80 flex-col border-l border-border bg-card shadow-[var(--shadow-card)]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <p className="text-sm font-semibold">Media</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange(false)}
          aria-label="Close media library"
          className="size-8 px-0"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="space-y-2 border-b border-border px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={library.search}
            onChange={(event) => library.setSearch(event.target.value)}
            placeholder="Search images…"
            className="h-8 pl-8"
            aria-label="Search media"
          />
        </div>

        <Select
          value={library.folder}
          onChange={(event) => library.setFolder(event.target.value)}
          aria-label="Filter by folder"
          className="h-8"
        >
          <option value="">All folders</option>
          <option value="root">No folder</option>
          {(library.data?.folders ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>

      <p className="px-3 py-2 text-xs text-muted-foreground">
        Drag an image onto a field, a gallery or into the text editor.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {library.error ? (
          <p className="py-10 text-center text-sm text-destructive">
            {library.error}
          </p>
        ) : library.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {library.loading
              ? "Loading…"
              : library.search || library.folder
                ? "Nothing matches that search."
                : "No images yet. Upload some in Media."}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {library.items.map((item) => (
              <li key={item.id}>
                <figure
                  draggable
                  onDragStart={(event) =>
                    setMediaDragData(event.dataTransfer, {
                      url: item.url,
                      alt: item.altText ?? "",
                    })
                  }
                  title={`${item.filename} — drag onto a field`}
                  className="cursor-grab overflow-hidden rounded-md border border-border transition-colors hover:border-primary active:cursor-grabbing"
                >
                  <div className="pointer-events-none aspect-square">
                    <MediaThumb
                      url={item.url}
                      kind={item.kind}
                      alt={item.altText ?? item.filename}
                    />
                  </div>
                  <figcaption className="space-y-0.5 px-2 py-1.5">
                    <p className="truncate text-[11px] font-medium">
                      {item.filename}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatBytes(item.size)}
                    </p>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}
      </div>

      {library.data && library.data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={library.page <= 1 || library.loading}
            onClick={() => library.setPage(library.page - 1)}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            {library.data.page} / {library.data.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={library.page >= library.data.totalPages || library.loading}
            onClick={() => library.setPage(library.page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </aside>,
    document.body,
  );
}
