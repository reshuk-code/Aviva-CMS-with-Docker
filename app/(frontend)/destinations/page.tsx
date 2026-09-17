import type { Metadata } from "next";
import Link from "next/link";

import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";

import { FeaturedImage } from "@/components/frontend/featured-image";
/**
 * Destination index — part of the default template.
 *
 * Like `/blog`, an editor can create a CMS page with the slug `/destinations`
 * to own this page's title and description; the listing itself stays here,
 * because a page of prose cannot enumerate records.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [managed, site] = await Promise.all([
    cms.pages.getBySlug("/destinations"),
    cms.settings.get(),
  ]);

  return generateCmsMetadata({
    title: managed?.title ?? "Destinations",
    path: "/destinations",
    description:
      managed?.excerpt ?? `The places ${site.siteName} runs trips to.`,
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

export default async function DestinationsIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selected = typeof params.country === "string" ? params.country : "";

  const [managed, destinations, countries] = await Promise.all([
    cms.pages.getBySlug("/destinations"),
    cms.destinations.getPublished(selected ? { country: selected } : undefined),
    cms.destinations.countries(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Where we go
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {managed?.title ?? "Destinations"}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {managed?.excerpt ??
            "Places we know well enough to send you there with a plan."}
        </p>
      </header>

      {countries.length > 1 ? (
        <nav aria-label="Countries" className="mt-10 flex flex-wrap gap-2">
          <FilterChip href="/destinations" active={!selected} label="All" />
          {countries.map((country) => (
            <FilterChip
              key={country}
              href={`/destinations?country=${encodeURIComponent(country)}`}
              active={selected === country}
              label={country}
            />
          ))}
        </nav>
      ) : null}

      {destinations.length === 0 ? (
        <p className="mt-16 rounded-card border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
          {selected
            ? `No destinations in ${selected} yet.`
            : "No destinations published yet. Add one in the admin."}
        </p>
      ) : (
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <li key={destination.id} className="group">
              <Link href={`/destinations/${destination.slug}`} className="block">
                <FeaturedImage
                  record={destination}
                  shape="card"
                  className="rounded-card shadow-[var(--shadow-card)] dark:border dark:border-border"
                />

                <div className="mt-4">
                  <h2 className="text-lg font-semibold tracking-tight group-hover:underline underline-offset-4">
                    {destination.name}
                  </h2>
                  {[destination.region, destination.country].filter(Boolean)
                    .length > 0 ? (
                    <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                      {[destination.region, destination.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  ) : null}
                  {destination.shortDescription ? (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {destination.shortDescription}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background"
          : "rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
