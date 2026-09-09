"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MediaThumb } from "@/components/cms/media-thumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/field";
import { formatBytes } from "@/lib/utils";
import type { MediaItem, MediaKind } from "@/types/content";

interface MediaResponse {
  items: MediaItem[];
  total: number;
  page: number;
  totalPages: number;
  folders: string[];
}

/**
 * Choose an existing file from the media library.
 *
 * Reads over `/api/cms/media` rather than through the CMS SDK, because the
 * picker searches and pages inside an open form where a server round-trip
 * would lose the editor's unsaved work.
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
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<MediaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          kind,
          page: String(page),
          perPage: "24",
        });
        if (search) params.set("search", search);
        if (folder) params.set("folder", folder);

        const response = await fetch(`/api/cms/media?${params}`, { signal });
        const body = await response.json();

        if (!response.ok) {
          setError(
            typeof body?.error === "string"
              ? body.error
              : "Could not load the media library.",
          );
          return;
        }

        setData(body as MediaResponse);
      } catch (cause) {
        if ((cause as Error).name === "AbortError") return;
        setError("Could not load the media library.");
      } finally {
        setLoading(false);
      }
    },
    [kind, page, search, folder],
  );

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    // Debounced so typing in the search box does not fire a request per key.
    const timer = setTimeout(() => void load(controller.signal), 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, load]);

  const items = data?.items ?? [];

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
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                // A fresh search starts at page one, not deep in the old
                // result set.
                setPage(1);
              }}
              placeholder="Search files…"
              className="pl-8"
              aria-label="Search media"
            />
          </div>

          <Select
            value={folder}
            onChange={(event) => {
              setFolder(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by folder"
            className="w-40"
          >
            <option value="">All folders</option>
            <option value="root">No folder</option>
            {(data?.folders ?? []).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-4 min-h-64">
          {error ? (
            <p className="py-12 text-center text-sm text-destructive">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : search || folder
                  ? "Nothing matches that search."
                  : "No files yet. Upload some in Media."}
            </p>
          ) : (
            <ul className="grid max-h-80 grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
              {items.map((item) => (
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
            {data ? `${data.total} file${data.total === 1 ? "" : "s"}` : ""}
          </p>

          {data && data.totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                {data.page} / {data.totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= data.totalPages || loading}
                onClick={() => setPage((value) => value + 1)}
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
