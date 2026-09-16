"use client";

import { useCallback, useEffect, useState } from "react";

import type { MediaItem, MediaKind } from "@/types/content";

/**
 * Reads the media library over `/api/cms/media`.
 *
 * Shared by the picker dialog and the media drawer. It lives in a hook rather
 * than in each component because the fiddly parts — debouncing the search,
 * aborting the request in flight, resetting to page one when a filter changes —
 * are exactly the parts that drift apart when they are written twice.
 *
 * HTTP rather than the SDK for the reason the picker already documented: these
 * run inside an open form, where a server round-trip would throw away the
 * editor's unsaved work.
 */
export interface MediaResponse {
  items: MediaItem[];
  total: number;
  page: number;
  totalPages: number;
  folders: string[];
}

export interface MediaLibrary {
  items: MediaItem[];
  data: MediaResponse | null;
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  folder: string;
  setFolder: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  /** Re-reads the current page. Call after an upload adds a file. */
  reload: () => void;
}

export function useMediaLibrary({
  active = true,
  kind = "image",
  perPage = 24,
}: {
  /** Skip fetching while the picker is closed or the drawer is collapsed. */
  active?: boolean;
  kind?: MediaKind | "any";
  perPage?: number;
} = {}): MediaLibrary {
  const [search, setSearchValue] = useState("");
  const [folder, setFolderValue] = useState("");
  const [page, setPage] = useState(1);
  const [nonce, setNonce] = useState(0);

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
          perPage: String(perPage),
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
    [kind, page, perPage, search, folder],
  );

  useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    // Debounced so typing in the search box does not fire a request per key.
    const timer = setTimeout(() => void load(controller.signal), 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [active, load, nonce]);

  /** A changed filter always starts at page one, not deep in the old results. */
  function setSearch(value: string) {
    setSearchValue(value);
    setPage(1);
  }

  function setFolder(value: string) {
    setFolderValue(value);
    setPage(1);
  }

  return {
    items: data?.items ?? [],
    data,
    loading,
    error,
    search,
    setSearch,
    folder,
    setFolder,
    page,
    setPage,
    reload: () => setNonce((value) => value + 1),
  };
}
