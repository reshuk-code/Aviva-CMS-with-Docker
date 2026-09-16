import Link from "next/link";

/**
 * The public 404.
 *
 * It lives in the (frontend) group so it inherits that layout: a visitor who
 * mistypes a URL still gets the site's header, navigation and footer, and a way
 * onward. Next's built-in default is an unstyled black-on-white line, which on
 * a client's live site reads as the site being broken rather than the address
 * being wrong.
 *
 * This file is the developer's, like the rest of app/(frontend). Rewrite it to
 * match the client's design.
 */
export const metadata = {
  title: "Page not found",
  // A missing page should never enter an index.
  robots: { index: false, follow: true },
};

const SUGGESTIONS = [
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Trips" },
  { href: "/blog", label: "Journal" },
  { href: "/contact", label: "Contact us" },
];

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center sm:py-32">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        We cannot find that page
      </h1>

      <p className="mx-auto mt-4 max-w-prose text-muted-foreground">
        The link may be out of date, or the page may have moved. Nothing is
        broken — it is just not here.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Back to the homepage
        </Link>
      </div>

      <div className="mt-12 border-t border-border pt-8">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Or try one of these
        </p>

        <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          {SUGGESTIONS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
