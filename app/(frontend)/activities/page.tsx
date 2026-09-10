import type { Metadata } from "next";
import Link from "next/link";

import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";

/**
 * Activity index — part of the default template.
 *
 * An activity is a label a tour is tagged with, so this page is mostly a way
 * in: pick what you want to do, then see the trips that involve it.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [managed, site] = await Promise.all([
    cms.pages.getBySlug("/activities"),
    cms.settings.get(),
  ]);

  return generateCmsMetadata({
    title: managed?.title ?? "Activities",
    path: "/activities",
    description: managed?.excerpt ?? `What you can do with ${site.siteName}.`,
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

export default async function ActivitiesIndexPage() {
  const [managed, activities, usage] = await Promise.all([
    cms.pages.getBySlug("/activities"),
    cms.activities.getPublished(),
    cms.tours.activityUsage(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          What you will be doing
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {managed?.title ?? "Activities"}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          {managed?.excerpt ??
            "Pick the kind of trip you are after and we will show you the routes."}
        </p>
      </header>

      {activities.length === 0 ? (
        <p className="mt-16 rounded-card border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
          No activities published yet. Add some in the admin under Activities.
        </p>
      ) : (
        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => {
            const count = usage[activity.id] ?? 0;

            return (
              <li key={activity.id} className="group">
                <Link
                  href={`/activities/${activity.slug}`}
                  className="flex h-full flex-col overflow-hidden rounded-card bg-card shadow-[var(--shadow-card)] transition-shadow hover:shadow-lg dark:border dark:border-border"
                >
                  {activity.featuredImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activity.featuredImage}
                      alt=""
                      loading="lazy"
                      className="aspect-[16/9] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : null}

                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="font-semibold tracking-tight">
                      {activity.name}
                    </h2>

                    {activity.description ? (
                      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                        {activity.description}
                      </p>
                    ) : (
                      <div className="flex-1" />
                    )}

                    <p className="mt-4 text-xs text-muted-foreground">
                      {count === 0
                        ? "No trips yet"
                        : `${count} trip${count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
