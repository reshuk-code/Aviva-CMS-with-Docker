import Link from "next/link";

/**
 * The last-resort 404.
 *
 * A group-level not-found only catches `notFound()` thrown inside that
 * segment. A URL that matches no route at all — `/admin/nonsense`, a stale
 * `/api/...` link — never reaches one, and would otherwise land on Next's
 * unstyled built-in page.
 *
 * It renders inside the root layout only, with no site header and no admin
 * chrome, because at this point the request matched neither. That is why it is
 * self-contained rather than reusing either shell.
 */
export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-surface px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          404
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Page not found
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          That address does not match anything on this site.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Go to the site
          </Link>

          <Link
            href="/admin"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            Go to the admin
          </Link>
        </div>
      </div>
    </main>
  );
}
