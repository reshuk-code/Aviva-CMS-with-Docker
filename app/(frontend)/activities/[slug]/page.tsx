import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PreviewBanner } from "@/components/frontend/preview-banner";
import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import { pluralise } from "@/lib/utils";
import type { Activity } from "@/types/content";

/**
 * One activity, and the trips that involve it.
 *
 * Tours store `activityIds`, so finding the trips means filtering published
 * tours by membership rather than querying by a foreign key — the adapter
 * contract has no reliable array-contains across every backend, which is why
 * the repository does this kind of work in JavaScript. The set here is
 * page-sized, so the cost is negligible.
 */
export const revalidate = 300;

async function resolveActivity(slug: string): Promise<Activity | null> {
  const { isEnabled } = await draftMode();
  return isEnabled
    ? cms.activities.getBySlugIncludingDrafts(slug)
    : cms.activities.getBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const activity = await resolveActivity(slug);

  if (!activity) return { title: "Not found" };

  return generateCmsMetadata({
    title: activity.name,
    path: `/activities/${activity.slug}`,
    description: activity.description,
    image: activity.featuredImage,
    seo: activity.seo,
  });
}

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const activity = await resolveActivity(slug);

  if (!activity) notFound();

  const { isEnabled: previewing } = await draftMode();

  const allTours = await cms.tours.getPublished();
  const tours = allTours.filter((tour) =>
    tour.activityIds.includes(activity.id),
  );

  return (
    <>
      {previewing ? (
        <PreviewBanner
          status={activity.status}
          path={`/activities/${activity.slug}`}
        />
      ) : null}

      <article className="mx-auto w-full max-w-4xl px-6 py-16 sm:py-24">
        <nav className="mb-8 text-sm">
          <Link
            href="/activities"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← All activities
          </Link>
        </nav>

        <header className="max-w-2xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {activity.name}
          </h1>
          {activity.description ? (
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
              {activity.description}
            </p>
          ) : null}
        </header>

        {activity.featuredImage ? (
          <figure className="mt-10 overflow-hidden rounded-card bg-muted shadow-[var(--shadow-card)] dark:border dark:border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activity.featuredImage}
              alt=""
              className="aspect-[16/9] w-full object-cover"
            />
          </figure>
        ) : null}

        <section className="mt-16">
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Trips involving {activity.name.toLowerCase()}
          </h2>

          {tours.length === 0 ? (
            <p className="mt-6 rounded-card border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
              No published trips are tagged with this activity yet. Tag one in
              the admin, in the tour editor under Placement.
            </p>
          ) : (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2">
              {tours.map((tour) => (
                <li key={tour.id}>
                  <Link
                    href={`/tours/${tour.slug}`}
                    className="flex h-full flex-col rounded-card bg-card p-5 shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg dark:border dark:border-border"
                  >
                    <h3 className="font-semibold leading-snug tracking-tight">
                      {tour.name}
                    </h3>
                    {tour.shortDescription ? (
                      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {tour.shortDescription}
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {[
                        tour.durationDays ? pluralise(tour.durationDays, "day") : null,
                        tour.difficulty,
                        tour.price !== null
                          ? `${tour.currency} ${tour.price.toLocaleString()}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="mt-16 rounded-card bg-surface px-6 py-8 text-center dark:border dark:border-border">
          <p className="text-lg font-medium">
            Want something built around {activity.name.toLowerCase()}?
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Tell us your dates
          </Link>
        </aside>
      </article>
    </>
  );
}
