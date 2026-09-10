import Link from "next/link";
import type { ReactNode } from "react";

import { cms } from "@/lib/cms";

/**
 * Public site layout.
 *
 * This file is the developer's, not the CMS's. It shows the intended pattern —
 * fetch data through the SDK in a Server Component, render it however you like
 * — and is meant to be replaced wholesale on a real client project.
 */

/**
 * Where the default template puts each content type.
 *
 * Used as the header fallback so a brand-new install is navigable before
 * anyone has built a menu in the admin: publish a destination and it is
 * reachable, rather than stranded behind an empty `<nav>`. As soon as the
 * client saves a real menu, that menu wins and this is never shown.
 */
const TEMPLATE_NAV = [
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Trips" },
  { href: "/activities", label: "Activities" },
  { href: "/blog", label: "Journal" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

export default async function FrontendLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [site, menu] = await Promise.all([
    cms.settings.get(),
    cms.navigation.get("main"),
  ]);

  const usingCmsMenu = menu.length > 0;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-background/80 shadow-[0_1px_0_var(--border)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href="/" className="font-semibold tracking-tight">
            {site.siteName}
          </Link>

          <nav aria-label="Main">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              {usingCmsMenu
                ? menu.map((item) => (
                    <li key={item.id}>
                      {item.href ? (
                        <Link
                          href={item.href}
                          target={item.openInNewTab ? "_blank" : undefined}
                          rel={item.openInNewTab ? "noreferrer" : undefined}
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{item.label}</span>
                      )}
                    </li>
                  ))
                : TEMPLATE_NAV.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-semibold tracking-tight">{site.siteName}</p>
              {site.tagline ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {site.tagline}
                </p>
              ) : null}
            </div>

            <nav aria-label="Explore">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Explore
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {TEMPLATE_NAV.slice(0, 3).map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="More">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                More
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {TEMPLATE_NAV.slice(3).map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Contact
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {site.contact.email ? (
                  <li>
                    <a
                      href={`mailto:${site.contact.email}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {site.contact.email}
                    </a>
                  </li>
                ) : null}
                {site.contact.phone ? (
                  <li>
                    <a
                      href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {site.contact.phone}
                    </a>
                  </li>
                ) : null}
                {site.contact.address ? (
                  <li className="text-muted-foreground">{site.contact.address}</li>
                ) : null}
              </ul>

              <SocialLinks social={site.social} />
            </div>
          </div>

          <p className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
            © {new Date().getFullYear()} {site.siteName}
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Only the networks the client actually filled in. */
function SocialLinks({
  social,
}: {
  social: Awaited<ReturnType<typeof cms.settings.get>>["social"];
}) {
  const links = (
    [
      ["Facebook", social.facebook],
      ["Instagram", social.instagram],
      ["Twitter", social.twitter],
      ["YouTube", social.youtube],
      ["Tripadvisor", social.tripadvisor],
    ] as const
  ).filter(([, href]) => Boolean(href));

  if (links.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
      {links.map(([label, href]) => (
        <li key={label}>
          <a
            href={href as string}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </a>
        </li>
      ))}
    </ul>
  );
}
