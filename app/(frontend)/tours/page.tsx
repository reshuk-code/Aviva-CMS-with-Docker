import type { Metadata } from "next";
import Link from "next/link";

import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import { pluralise } from "@/lib/utils";
import { TOUR_DIFFICULTIES, type TourDifficulty } from "@/types/content";

import { FeaturedImage } from "@/components/frontend/featured-image";
/**
 * Tour index — part of the default template.
 *
 * Filters by difficulty because that is the first thing a traveller rules out.
 * The filter is a query string rather than client state so the URL stays
 * shareable and the server does the work.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [managed, site] = await Promise.all([
    cms.pages.getBySlug("/tours"),
    cms.settings.get(),
  ]);

  return generateCmsMetadata({
    title: managed?.title ?? "Trips",
    path: "/tours",
    description: managed?.excerpt ?? `Trips run by ${site.siteName}.`,
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

function parseDifficulty(value: unknown): TourDifficulty | undefined {
  return TOUR_DIFFICULTIES.includes(value as TourDifficulty)
    ? (value as TourDifficulty)
    : undefined;
}

export default async function ToursIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const difficulty = parseDifficulty(params.difficulty);

  const [managed, tours, destinations] = await Promise.all([
    cms.pages.getBySlug("/tours"),
    cms.tours.getPublished(difficulty ? { difficulty } : undefined),
    cms.destinations.getPublished(),
  ]);

  const destinationNames = new Map(
    destinations.map((destination) => [destination.id, destination]),
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          What we run
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {managed?.title ?? "Trips"}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {managed?.excerpt ??
            "Fixed routes we know well. Any of them can be adapted to your dates and pace."}
        </p>
      </header>

      <nav aria-label="Difficulty" className="mt-10 flex flex-wrap gap-2">
        <Chip href="/tours" active={!difficulty} label="All" />
        {TOUR_DIFFICULTIES.map((level) => (
          <Chip
            key={level}
            href={`/tours?difficulty=${level}`}
            active={difficulty === level}
            label={level}
          />
        ))}
      </nav>

      {tours.length === 0 ? (
        <p className="mt-16 rounded-card border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
          {difficulty
            ? `No ${difficulty} trips published yet.`
            : "No trips published yet. Add one in the admin under Tour Packages."}
        </p>
      ) : (
        <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((tour) => {
            const destination = tour.destinationId
              ? destinationNames.get(tour.destinationId)
              : undefined;

            return (
              <li key={tour.id} className="group flex flex-col">
                <Link href={`/tours/${tour.slug}`} className="block">
                  <FeaturedImage
                    record={tour}
                    shape="card"
                    className="rounded-card shadow-[var(--shadow-card)] dark:border dark:border-border"
                  />
                </Link>

                <div className="mt-4 flex flex-1 flex-col">
                  {destination ? (
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {destination.name}
                    </p>
                  ) : null}

                  <h2 className="mt-1 text-lg font-semibold leading-snug tracking-tight">
                    <Link
                      href={`/tours/${tour.slug}`}
                      className="group-hover:underline underline-offset-4"
                    >
                      {tour.name}
                    </Link>
                  </h2>

                  {tour.shortDescription ? (
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {tour.shortDescription}
                    </p>
                  ) : (
                    <div className="flex-1" />
                  )}

                  <p className="mt-3 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {tour.durationDays ? (
                      <span>{pluralise(tour.durationDays, "day")}</span>
                    ) : null}
                    {tour.difficulty ? (
                      <span className="capitalize">{tour.difficulty}</span>
                    ) : null}
                    {tour.maxAltitude ? (
                      <span>{tour.maxAltitude.toLocaleString()} m</span>
                    ) : null}
                  </p>

                  {tour.price !== null ? (
                    <p className="mt-3 border-t border-border pt-3 text-sm">
                      <span className="font-semibold">
                        {tour.currency} {tour.price.toLocaleString()}
                      </span>
                      {tour.compareAtPrice !== null &&
                      tour.compareAtPrice > tour.price ? (
                        <span className="ml-2 text-muted-foreground line-through">
                          {tour.currency} {tour.compareAtPrice.toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Chip({
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
          ? "rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium capitalize text-background"
          : "rounded-full border border-border px-3.5 py-1.5 text-sm capitalize text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
