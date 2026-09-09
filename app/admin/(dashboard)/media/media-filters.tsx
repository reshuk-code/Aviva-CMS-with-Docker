"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input, Select } from "@/components/ui/field";
import { MEDIA_KINDS } from "@/types/content";

const KIND_LABELS: Record<string, string> = {
  any: "All types",
  image: "Images",
  video: "Video",
  document: "Documents",
  audio: "Audio",
  other: "Other",
};

/**
 * Search, type and folder filters for the media library.
 *
 * Like `ListToolbar`, this writes to the query string rather than holding
 * state, so the server re-queries and the filtered view stays shareable. The
 * status filter would be meaningless here — media has no editorial lifecycle —
 * so this is a separate component rather than another flag on that one.
 */
export function MediaFilters({ folders }: { folders: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("search", search);
      else params.delete("search");
      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
    // `searchParams` is excluded deliberately — see the note in ListToolbar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, pathname, router]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      <div className="relative min-w-56 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by filename, alt text or caption…"
          className="pl-8"
          aria-label="Search media"
        />
      </div>

      <Select
        value={searchParams.get("kind") ?? "any"}
        onChange={(event) => setParam("kind", event.target.value)}
        aria-label="Filter by type"
        className="w-36"
      >
        {["any", ...MEDIA_KINDS].map((kind) => (
          <option key={kind} value={kind}>
            {KIND_LABELS[kind]}
          </option>
        ))}
      </Select>

      <Select
        value={searchParams.get("folder") ?? ""}
        onChange={(event) => setParam("folder", event.target.value)}
        aria-label="Filter by folder"
        className="w-40"
      >
        <option value="">All folders</option>
        <option value="root">No folder</option>
        {folders.map((folder) => (
          <option key={folder} value={folder}>
            {folder}
          </option>
        ))}
      </Select>
    </div>
  );
}
