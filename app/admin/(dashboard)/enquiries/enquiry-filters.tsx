"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Input, Select } from "@/components/ui/field";
import { ENQUIRY_STATUSES } from "@/types/content";

const STATUS_LABELS: Record<string, string> = {
  any: "All enquiries",
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  converted: "Converted",
  closed: "Closed",
  spam: "Spam",
};

/**
 * Search and triage-state filter for the inbox.
 *
 * The query key is `state`, not `status`: on every other list `status` means
 * the publication lifecycle, and reusing it here would make one URL parameter
 * mean two different things.
 */
export function EnquiryFilters({
  counts,
}: {
  counts: Record<string, number>;
}) {
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
    if (value && value !== "any") params.set(key, value);
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
          placeholder="Search by name, email or message…"
          className="pl-8"
          aria-label="Search enquiries"
        />
      </div>

      <Select
        value={searchParams.get("state") ?? "any"}
        onChange={(event) => setParam("state", event.target.value)}
        aria-label="Filter by triage state"
        className="w-44"
      >
        {["any", ...ENQUIRY_STATUSES].map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
            {status !== "any" && counts[status] ? ` (${counts[status]})` : ""}
          </option>
        ))}
      </Select>
    </div>
  );
}
