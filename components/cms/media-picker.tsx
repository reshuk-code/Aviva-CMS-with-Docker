"use client";

import { Search } from "lucide-react";

import { MediaThumb } from "@/components/cms/media-thumb";
import { useMediaLibrary } from "@/components/cms/use-media-library";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { formatBytes } from "@/lib/utils";
import type { MediaItem, MediaKind } from "@/types/content";

/**
 * Choose an existing file from the media library.
 *
 * Reads over `/api/cms/media` rather than through the CMS SDK, because the
 * picker searches and pages inside an open form where a server round-trip
 * would lose the editor's unsaved work. That fetching lives in
 * `useMediaLibrary`, shared with the media drawer.
 *
 * Uploading happens at /admin/media. Keeping this read-only means one place
 * enforces folders, alt text and the size limit.
 */
export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  kind = "image",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MediaItem) => void;
  /** Restrict to one kind, or "any" for every file. */
  kind?: MediaKind | "any";
}) {
  const library = useMediaLibrary({ active: open, kind });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Choose a file"
        description="Files uploaded in the media library."
        className="max-w-2xl"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={library.search}
              onChange={(event) => library.setSearch(event.target.value)}
              placeholder="Search files…"
              className="pl-8"
              aria-label="Search media"
            />
          </div>

          <Select
            value={library.folder}
            onChange={(event) => library.setFolder(event.target.value)}
            aria-label="Filter by folder"
            className="w-40"
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

        <div className="mt-4 min-h-64">
          {library.error ? (
            <p className="py-12 text-center text-sm text-destructive">
              {library.error}
            </p>
          ) : library.items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {library.loading
                ? "Loading…"
                : library.search || library.folder
                  ? "Nothing matches that search."
                  : "No files yet. Upload some in Media."}
            </p>
          ) : (
            <ul className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {library.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(item);
                      onOpenChange(false);
                    }}
                    className="w-full overflow-hidden rounded-lg border border-border text-left transition-colors hover:border-primary"
                  >
                    <div className="aspect-square overflow-hidden">
                      <MediaThumb
                        url={item.url}
                        kind={item.kind}
                        alt={item.altText ?? item.filename}
                      />
                    </div>
                    <div className="space-y-0.5 px-2 py-1.5">
                      <p className="truncate text-[11px] font-medium" title={item.filename}>
                        {item.filename}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(item.size)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="justify-between">
          <p className="text-xs text-muted-foreground">
            {library.data
              ? `${library.data.total} file${library.data.total === 1 ? "" : "s"}`
              : ""}
          </p>

          {library.data && library.data.totalPages > 1 ? (
            <div className="flex items-center gap-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
