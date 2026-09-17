import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Paginated } from "@/types/common";
import { DEFAULT_PER_PAGE, MAX_PER_PAGE } from "@/types/common";

/**
 * "Showing 20 of 57" and a button that reveals the next twenty.
 *
 * Still a link, not a fetch: the window size lives in the URL as `perPage`, so
 * a list stays shareable and bookmarkable, survives a refresh, and works with
 * JavaScript off — the same reason page numbers lived there before. Growing
 * the window rather than replacing it is what makes it read as "load more":
 * the rows already on screen stay put and twenty more appear underneath.
 *
 * Above `MAX_PER_PAGE` it hands over to page navigation, because the window
 * cannot keep growing without making one request fetch the whole collection.
 * Without that fallback, a client with three hundred trips would have no way
 * to reach the last hundred.
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
  const href = (params: Record<string, string>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (value) query.set(key, value);
    }
    for (const [key, value] of Object.entries(params)) query.set(key, value);
    return `${basePath}?${query.toString()}`;
  };

  const shown = Math.min(result.page * result.perPage, result.total);
  const remaining = result.total - shown;

  if (remaining <= 0 && result.page === 1) return null;

  // One more window's worth, or whatever is left if that is less.
  const nextWindow = result.perPage + DEFAULT_PER_PAGE;
  const canGrow = result.perPage < MAX_PER_PAGE && result.page === 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-muted-foreground">
        {shown} of {result.total}
      </p>

      {remaining > 0 && canGrow ? (
        <Button variant="outline" size="sm" asChild>
          <Link
            href={href({ perPage: String(Math.min(nextWindow, MAX_PER_PAGE)) })}
            // The window is already rendered above; replacing history here
            // would make Back leave the list entirely rather than shrink it.
            scroll={false}
          >
            Load next {Math.min(DEFAULT_PER_PAGE, remaining)}
          </Link>
        </Button>
      ) : null}

      {!canGrow ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild={result.page > 1}
            disabled={result.page <= 1}
          >
            {result.page > 1 ? (
              <Link
                href={href({
                  page: String(result.page - 1),
                  perPage: String(result.perPage),
                })}
              >
                Previous
              </Link>
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
              <Link
                href={href({
                  page: String(result.page + 1),
                  perPage: String(result.perPage),
                })}
              >
                Next
              </Link>
            ) : (
              <span>Next</span>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
