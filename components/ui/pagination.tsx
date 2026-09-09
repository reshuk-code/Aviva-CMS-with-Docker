import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Paginated } from "@/types/common";

/**
 * Link-based pagination: page state lives in the URL, so lists are
 * shareable, bookmarkable and work without JavaScript.
 */
export function Pagination<T>({
  result,
  basePath,
  searchParams,
}: {
  result: Pick<Paginated<T>, "page" | "totalPages" | "total" | "perPage">;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (result.totalPages <= 1) return null;

  const href = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) params.set(key, value);
    }
    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  };

  const from = (result.page - 1) * result.perPage + 1;
  const to = Math.min(result.page * result.perPage, result.total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {result.total}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild={result.page > 1}
          disabled={result.page <= 1}
        >
          {result.page > 1 ? (
            <Link href={href(result.page - 1)}>Previous</Link>
          ) : (
            <span>Previous</span>
          )}
        </Button>

        <span className="text-xs text-muted-foreground">
          Page {result.page} of {result.totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          asChild={result.page < result.totalPages}
          disabled={result.page >= result.totalPages}
        >
          {result.page < result.totalPages ? (
            <Link href={href(result.page + 1)}>Next</Link>
          ) : (
            <span>Next</span>
          )}
        </Button>
      </div>
    </div>
  );
}
