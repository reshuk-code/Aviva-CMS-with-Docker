import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PreviewBanner } from "@/components/frontend/preview-banner";
import { RichListText, RichText } from "@/components/frontend/rich-text";
import { pickImage } from "@/lib/images";
import { isEmptyRichList } from "@/lib/rich-text";
import { cms } from "@/lib/cms";
import { EmbeddedFaqs } from "@/components/frontend/embedded-faqs";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import { pluralise } from "@/lib/utils";
import type { Destination } from "@/types/content";

/**
 * One destination.
 *
 * Honours draft mode like the blog post route, so the admin Preview button
 * works here too. Destinations carry bare slugs, so mounting them at
 * `/destinations/[slug]` is this project's decision, not the CMS's.
 */
export const revalidate = 300;

async function resolveDestination(slug: string): Promise<Destination | null> {
  const { isEnabled } = await draftMode();
  return isEnabled
    ? cms.destinations.getBySlugIncludingDrafts(slug)
    : cms.destinations.getBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const destination = await resolveDestination(slug);

  if (!destination) return { title: "Not found" };

  return generateCmsMetadata({
    title: destination.name,
    path: `/destinations/${destination.slug}`,
    description: destination.shortDescription,
    image: pickImage(destination, "banner"),
    seo: destination.seo,
  });
}

export default async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = await resolveDestination(slug);

  if (!destination) notFound();

  const heroImage = pickImage(destination, "banner");

  const { isEnabled: previewing } = await draftMode();

  // Tours that go here. Empty until the client publishes some, which is the
  // normal state on a new site rather than an error.
  const tours = await cms.tours.getByDestination(destination.id, 3);

  const place = [destination.region, destination.country]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      {previewing ? (
        <PreviewBanner
          status={destination.status}
          path={`/destinations/${destination.slug}`}
        />
      ) : null}

      <article>
        {/* --------------------------------------------------------- hero */}
        <header className="relative overflow-hidden border-b border-border">
          {/* The hero is the banner slot, falling back down the ladder. */}
          {heroImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-background/55"
              />
            </>
          ) : null}

          <div className="relative mx-auto w-full max-w-4xl px-6 py-24 sm:py-32">
            <nav className="mb-6 text-sm">
              <Link
                href="/destinations"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                ← All destinations
              </Link>
            </nav>

            {place ? (
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                {place}
              </p>
            ) : null}

            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {destination.name}
            </h1>

            {destination.shortDescription ? (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {destination.shortDescription}
              </p>
            ) : null}
          </div>
        </header>

        <div className="mx-auto w-full max-w-4xl px-6 py-16">
          {/* ------------------------------------------------------ facts */}
          <FactRow destination={destination} />

          <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_16rem] lg:items-start">
            <div>
              {destination.description ? (
                <div className="leading-relaxed [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold">
                  <RichText content={destination.description} />
                </div>
              ) : null}

              {destination.gallery.length > 0 ? (
                <section className="mt-14">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Gallery
                  </h2>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {destination.gallery.map((url) => (
                      <li
                        key={url}
                        className="overflow-hidden rounded-card bg-muted shadow-[var(--shadow-card)] dark:border dark:border-border"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          loading="lazy"
                          data-lightbox
                          className="aspect-[4/3] w-full object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {/* --------------------------------------------------- aside */}
            <aside className="space-y-8 lg:sticky lg:top-8">
              {!isEmptyRichList(destination.highlights) ? (
                <section>
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Highlights
                  </h2>
                  <div className="mt-4 text-sm leading-relaxed">
                    <RichListText content={destination.highlights} />
                  </div>
                </section>
              ) : null}

              <section className="rounded-card bg-card p-5 shadow-[var(--shadow-card)] dark:border dark:border-border">
                <p className="text-sm font-medium">Thinking about {destination.name}?</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  We will put a route together around your dates.
                </p>
                <Link
                  href={`/contact?destination=${encodeURIComponent(destination.slug)}`}
                  className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Enquire
                </Link>
              </section>
            </aside>
          </div>

          <EmbeddedFaqs faqs={destination.faqs} heading={`Questions about ${destination.name}`} />

          {/* ------------------------------------------------------ tours */}
          {tours.length > 0 ? (
            <section className="mt-20 border-t border-border pt-12">
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Trips that go here
              </h2>
              <ul className="mt-8 grid gap-6 sm:grid-cols-3">
                {tours.map((tour) => (
                  <li
                    key={tour.id}
                    className="rounded-card bg-card p-5 shadow-[var(--shadow-card)] dark:border dark:border-border"
                  >
                    <h3 className="font-semibold leading-snug tracking-tight">
                      {tour.name}
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {[
                        tour.durationDays ? pluralise(tour.durationDays, "day") : null,
                        tour.difficulty,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {tour.price !== null ? (
                      <p className="mt-3 text-sm font-semibold">
                        {tour.currency} {tour.price.toLocaleString()}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </>
  );
}

/** The four facts a traveller asks first, each hidden when unknown. */
function FactRow({ destination }: { destination: Destination }) {
  const facts = [
    { label: "Country", value: destination.country },
    { label: "Region", value: destination.region },
    { label: "Typical trip", value: destination.typicalDuration },
    {
      label: "Best months",
      value:
        destination.bestSeason.length > 0
          ? destination.bestSeason.map((month) => month.slice(0, 3)).join(", ")
          : "Year-round",
    },
  ].filter((fact) => Boolean(fact.value));

  if (facts.length === 0) return null;

  return (
    <dl className="grid gap-6 border-y border-border py-6 sm:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {fact.label}
          </dt>
          <dd className="mt-1 text-sm font-medium">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
