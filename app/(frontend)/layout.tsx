import Link from "next/link";
import type { ReactNode } from "react";

import { Lightbox } from "@/components/frontend/lightbox";
import { SiteNav } from "@/components/frontend/site-nav";
import { cms } from "@/lib/cms";
import { cn } from "@/lib/utils";
import type { ResolvedMenuItem } from "@/types/navigation";
import type { SiteSettings } from "@/types/settings";

/**
 * Public site layout.
 *
 * This file is the developer's, not the CMS's. It shows the intended pattern —
 * fetch data through the SDK in a Server Component, render it however you like
 * — and is meant to be replaced wholesale on a real client project.
 *
 * Header and footer chrome comes from `settings.header` / `settings.footer`
 * (/admin/settings/header and /footer). The CMS decides *what* appears; the
 * markup below stays entirely the developer's.
 */

/**
 * Where the default template puts each content type.
 *
 * Used as the fallback for both the header menu and the footer columns, so a
 * brand-new install is navigable before anyone has built a menu in the admin:
 * publish a destination and it is reachable, rather than stranded behind an
 * empty `<nav>`. As soon as the client saves a real menu, that menu wins and
 * this is never shown.
 */
const TEMPLATE_NAV = [
  { href: "/destinations", label: "Destinations" },
  { href: "/tours", label: "Trips" },
  { href: "/activities", label: "Activities" },
  { href: "/blog", label: "Journal" },
  { href: "/faqs", label: "FAQs" },
  { href: "/contact", label: "Contact" },
];

const FALLBACK_FOOTER_COLUMNS = [
  { heading: "Explore", entries: TEMPLATE_NAV.slice(0, 3) },
  { heading: "More", entries: TEMPLATE_NAV.slice(3) },
];

interface FooterColumnView {
  heading: string;
  items: ResolvedMenuItem[];
}

/** Shapes the hard-coded fallback into what the menu renderers already take. */
function toResolved(
  entries: { href: string; label: string }[],
): ResolvedMenuItem[] {
  return entries.map((entry) => ({
    id: entry.href,
    label: entry.label,
    href: entry.href,
    openInNewTab: false,
    children: [],
  }));
}

export default async function FrontendLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [site, menu] = await Promise.all([
    cms.settings.get(),
    cms.navigation.get("main"),
  ]);

  const { header, footer } = site;

  /*
   * One list for the nav, whichever source it came from.
   *
   * The template fallback is shaped into `ResolvedMenuItem` here rather than
   * branched over in the markup: the nav then has one thing to render, and the
   * mobile panel does not need its own copy of the branch.
   */
  const navItems: ResolvedMenuItem[] =
    menu.length > 0 ? menu : toResolved(TEMPLATE_NAV);

  /*
   * Footer columns name menus rather than carrying their own links, so each
   * one is resolved the same way the header menu is. A column whose menu was
   * deleted — or whose every item points at unpublished content — resolves to
   * nothing and is dropped, rather than rendering a heading over a void.
   */
  const configuredColumns: FooterColumnView[] = (
    await Promise.all(
      footer.columns.map(async (column) => ({
        heading: column.heading,
        items: await cms.navigation.get(column.menuKey),
      })),
    )
  ).filter((column) => column.items.length > 0);

  const footerColumns: FooterColumnView[] =
    configuredColumns.length > 0
      ? configuredColumns
      : FALLBACK_FOOTER_COLUMNS.map((column) => ({
          heading: column.heading,
          items: toResolved(column.entries),
        }));

  const showHeaderContact =
    header.showContact && Boolean(site.contact.phone || site.contact.email);
  const headerCta =
    header.cta.label && header.cta.href
      ? { label: header.cta.label, href: header.cta.href }
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <AnnouncementBar announcement={header.announcement} />

      <header
        className={cn(
          "bg-background/80 shadow-[0_1px_0_var(--border)] backdrop-blur-md",
          // Above the announcement bar in z-order, but not stuck to it: the
          // notice scrolls away, the navigation stays.
          header.sticky && "sticky top-0 z-40",
        )}
      >
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight"
          >
            {site.logo ? (
              /*
               * The logo replaces the name here rather than sitting beside it,
               * so alt carries the site name — a header linking to the home
               * page with no accessible text is a dead end for a screen reader.
               */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={site.logo}
                alt={site.siteName}
                className="h-8 w-auto object-contain"
              />
            ) : (
              site.siteName
            )}
          </Link>

          <div className="flex items-center gap-4">
            <SiteNav items={navItems} />

            {showHeaderContact ? (
              /* Hidden below md, where the nav collapses to a button and there
                 is no room left on the row. The footer still carries these. */
              <p className="hidden items-center gap-3 text-sm text-muted-foreground lg:flex">
                {site.contact.phone ? (
                  <a
                    href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {site.contact.phone}
                  </a>
                ) : null}
                {site.contact.email ? (
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="transition-colors hover:text-foreground"
                  >
                    {site.contact.email}
                  </a>
                ) : null}
              </p>
            ) : null}

            {headerCta ? (
              <Link
                href={headerCta.href}
                className="hidden shrink-0 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:block"
              >
                {headerCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-6xl px-6 py-14">
          <div
            className={cn(
              "grid gap-10 sm:grid-cols-2",
              // The about block and the contact block bracket the columns, so
              // the track count follows how many the client configured.
              footerColumns.length >= 3 ? "lg:grid-cols-5" : "lg:grid-cols-4",
            )}
          >
            <div>
              <p className="font-semibold tracking-tight">{site.siteName}</p>
              {(footer.blurb ?? site.tagline) ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {footer.blurb ?? site.tagline}
                </p>
              ) : null}
            </div>

            {footerColumns.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {column.heading}
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  {column.items.map((item) => (
                    <li key={item.id}>
                      <FooterLink item={item} />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            {footer.showContact || footer.showSocial ? (
              <div>
                {footer.showContact ? (
                  <>
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
                        <li className="text-muted-foreground">
                          {site.contact.address}
                        </li>
                      ) : null}
                    </ul>
                  </>
                ) : null}

                {footer.showSocial ? <SocialLinks social={site.social} /> : null}
              </div>
            ) : null}
          </div>

          <div className="mt-12 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-border pt-6 text-sm text-muted-foreground">
            <p>{copyrightLine(footer.copyright, site.siteName)}</p>
            {footer.legalNote ? (
              <p className="text-xs">{footer.legalNote}</p>
            ) : null}
          </div>
        </div>
      </footer>

      <Lightbox />
    </div>
  );
}

/**
 * The strip above the header.
 *
 * With a link but no label the whole line becomes the link, which is what an
 * editor who filled in only a URL meant; with both, the notice stays text and
 * the label is the only thing clickable.
 */
function AnnouncementBar({
  announcement,
}: {
  announcement: SiteSettings["header"]["announcement"];
}) {
  if (!announcement.enabled || !announcement.text) return null;

  const { text, href, linkLabel } = announcement;

  return (
    <div className="bg-primary text-primary-foreground">
      <p className="mx-auto w-full max-w-6xl px-6 py-2 text-center text-sm">
        {href && !linkLabel ? (
          <Link href={href} className="underline-offset-4 hover:underline">
            {text}
          </Link>
        ) : (
          <>
            {text}
            {href && linkLabel ? (
              <>
                {" "}
                <Link href={href} className="font-medium underline underline-offset-4">
                  {linkLabel}
                </Link>
              </>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * One footer link, which may not be a link at all.
 *
 * The CMS resolves an item to `href: null` for a plain heading, and a link to
 * nowhere is worse than text — the same rule `SiteNav` follows.
 */
function FooterLink({ item }: { item: ResolvedMenuItem }) {
  if (!item.href) {
    return <span className="text-muted-foreground">{item.label}</span>;
  }

  return (
    <Link
      href={item.href}
      target={item.openInNewTab ? "_blank" : undefined}
      rel={item.openInNewTab ? "noreferrer" : undefined}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      {item.label}
    </Link>
  );
}

/** Expands the tokens the footer screen documents, with a sane default. */
function copyrightLine(template: string | null, siteName: string): string {
  const year = String(new Date().getFullYear());

  if (!template) return `© ${year} ${siteName}`;

  return template.replaceAll("{year}", year).replaceAll("{siteName}", siteName);
}

/** Only the networks the client actually filled in. */
function SocialLinks({ social }: { social: SiteSettings["social"] }) {
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
