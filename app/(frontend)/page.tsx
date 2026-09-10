import type { Metadata } from "next";
import Link from "next/link";

import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import { formatDate, pluralise } from "@/lib/utils";

/**
 * Home page — a hand-written developer route.
 *
 * Declared in `config/routes.ts` with `cmsMetadata: true`, so an editor
 * manages its title and description from the admin (a CMS page with the slug
 * "/") while the developer keeps this markup. That is the split the platform
 * is built around: CMS owns content, developer owns presentation.
 *
 * Every section reads from a different SDK namespace and disappears when that
 * namespace is empty, so this doubles as a live check that the modules are
 * wired up. Replace it on a real client project.
 *
 * Rendering: static with a revalidation window. The admin calls
 * `revalidatePath` whenever content changes, so edits appear immediately
 * without every visitor request hitting the database.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [managed, site] = await Promise.all([
    cms.pages.getBySlug("/"),
    cms.settings.get(),
  ]);

  return generateCmsMetadata({
    title: managed?.title ?? site.siteName,
    path: "/",
    description: managed?.excerpt ?? site.tagline,
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

export default async function HomePage() {
  const [site, destinations, tours, posts, testimonials, activities, faqs] =
    await Promise.all([
      cms.settings.get(),
      cms.destinations.getPublished({ perPage: 6 }),
      cms.tours.getPublished({ perPage: 3 }),
      cms.posts.getPublished({ perPage: 3 }),
      cms.testimonials.getPublished({ perPage: 3 }),
      cms.activities.getPublished({ perPage: 8 }),
      cms.faqs.getPublished({ perPage: 5 }),
    ]);

  const hero = destinations[0] ?? null;

  return (
    <>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-border">
        {hero?.featuredImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.featuredImage}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-br from-background via-background/92 to-background/60"
            />
          </>
        ) : null}

        <div className="relative mx-auto w-full max-w-5xl px-6 py-28 sm:py-36">
          <div className="max-w-2xl">
            {site.tagline ? (
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                {site.tagline}
              </p>
            ) : null}

            <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
              {site.siteName}
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Small groups, local guides, and routes we have walked ourselves.
              Tell us roughly what you have in mind and we will build the trip
              around it.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Plan your trip
              </Link>
              <Link
                href="/blog"
                className="rounded-xl bg-card px-5 py-2.5 shadow-[var(--shadow-card)] text-sm font-medium backdrop-blur transition-colors hover:border-foreground/30"
              >
                Read the journal
              </Link>
            </div>

            {activities.length > 0 ? (
              <p className="mt-10 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">We run </span>
                {activities.map((activity, index) => (
                  <span key={activity.id}>
                    {index > 0 ? ", " : ""}
                    <Link
                      href={`/activities/${activity.slug}`}
                      className="underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {activity.name.toLowerCase()}
                    </Link>
                  </span>
                ))}
                .
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- destinations */}
      {destinations.length > 0 ? (
        <Section
          eyebrow="Where we go"
          title="Destinations"
          action={{ href: "/destinations", label: "All destinations" }}
        >
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination) => (
              <li key={destination.id} className="group">
                <Link
                  href={`/destinations/${destination.slug}`}
                  className="block"
                >
                  <div className="overflow-hidden rounded-card bg-muted shadow-[var(--shadow-card)] dark:border dark:border-border">
                    {destination.featuredImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={destination.featuredImage}
                        alt=""
                        loading="lazy"
                        className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="aspect-[4/3] w-full" />
                    )}
                  </div>

                  <div className="mt-4">
                    <h3 className="text-lg font-semibold tracking-tight group-hover:underline underline-offset-4">
                      {destination.name}
                    </h3>
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
                    {destination.typicalDuration ? (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Typically {destination.typicalDuration}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* --------------------------------------------------------- tours */}
      {tours.length > 0 ? (
        <Section
          eyebrow="What we sell"
          title="Trips"
          action={{ href: "/tours", label: "All trips" }}
          muted
        >
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tours.map((tour) => (
              <li
                key={tour.id}
                className="flex flex-col rounded-card bg-card p-6 shadow-[var(--shadow-card)] dark:border dark:border-border"
              >
                <h3 className="text-lg font-semibold tracking-tight">
                  <Link
                    href={`/tours/${tour.slug}`}
                    className="hover:underline underline-offset-4"
                  >
                    {tour.name}
                  </Link>
                </h3>

                {tour.shortDescription ? (
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {tour.shortDescription}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}

                <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  {tour.durationDays ? (
                    <div>
                      <dt className="sr-only">Duration</dt>
                      <dd>{pluralise(tour.durationDays, "day")}</dd>
                    </div>
                  ) : null}
                  {tour.difficulty ? (
                    <div>
                      <dt className="sr-only">Difficulty</dt>
                      <dd className="capitalize">{tour.difficulty}</dd>
                    </div>
                  ) : null}
                  {tour.maxAltitude ? (
                    <div>
                      <dt className="sr-only">Maximum altitude</dt>
                      <dd>{tour.maxAltitude} m</dd>
                    </div>
                  ) : null}
                </dl>

                {tour.price !== null ? (
                  <p className="mt-5 border-t border-border pt-4 text-sm">
                    <span className="text-xl font-semibold">
                      {tour.currency} {tour.price.toLocaleString()}
                    </span>
                    {tour.compareAtPrice !== null &&
                    tour.compareAtPrice > tour.price ? (
                      <span className="ml-2 text-muted-foreground line-through">
                        {tour.currency} {tour.compareAtPrice.toLocaleString()}
                      </span>
                    ) : null}
                    {tour.priceNote ? (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {tour.priceNote}
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* -------------------------------------------------- testimonials */}
      {testimonials.length > 0 ? (
        <Section eyebrow="What people say" title="Travellers">
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <li
                key={testimonial.id}
                className="rounded-card bg-card p-6 shadow-[var(--shadow-card)] dark:border dark:border-border"
              >
                <p
                  className="text-amber-500"
                  aria-label={`${testimonial.rating} out of 5`}
                >
                  {"★".repeat(testimonial.rating)}
                  <span className="text-muted-foreground/40">
                    {"★".repeat(5 - testimonial.rating)}
                  </span>
                </p>

                <blockquote className="mt-4 text-sm leading-relaxed">
                  “{testimonial.message}”
                </blockquote>

                <footer className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  {testimonial.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={testimonial.image}
                      alt=""
                      loading="lazy"
                      className="size-9 rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="text-sm font-medium">{testimonial.name}</p>
                    {[
                      testimonial.position,
                      testimonial.company,
                      testimonial.country,
                    ].filter(Boolean).length > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {[
                          testimonial.position,
                          testimonial.company,
                          testimonial.country,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </footer>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* --------------------------------------------------------- posts */}
      {posts.length > 0 ? (
        <Section
          eyebrow="From the journal"
          title="Recent writing"
          action={{ href: "/blog", label: "All posts" }}
          muted
        >
          <ul className="grid gap-8 sm:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id} className="group">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className="overflow-hidden rounded-card bg-card shadow-[var(--shadow-card)] dark:border dark:border-border">
                    {post.featuredImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.featuredImage}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="aspect-[16/10] w-full" />
                    )}
                  </div>

                  <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
                    {[
                      post.category,
                      post.publishedAt ? formatDate(post.publishedAt) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>

                  <h3 className="mt-1.5 font-semibold leading-snug tracking-tight group-hover:underline underline-offset-4">
                    {post.title}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* ---------------------------------------------------------- faqs */}
      {faqs.length > 0 ? (
        <Section
          eyebrow="Before you ask"
          title="Common questions"
          action={{ href: "/faqs", label: "All questions" }}
        >
          <dl className="divide-y divide-border border-y border-border">
            {faqs.map((faq) => (
              <details key={faq.id} className="group py-4">
                <summary className="flex cursor-pointer items-start justify-between gap-4 font-medium marker:content-['']">
                  <dt>{faq.question}</dt>
                  <span
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <dd className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </dd>
              </details>
            ))}
          </dl>
        </Section>
      ) : null}

      {/* ----------------------------------------------------------- cta */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Where do you want to go?
          </h2>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted-foreground">
            Send us a rough idea — dates, how many of you, how hard you want it
            to be. We will come back with a route and a price.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Start planning
          </Link>

          {site.contact.phone ? (
            <p className="mt-5 text-sm text-muted-foreground">
              Or call{" "}
              <a
                href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}
                className="text-foreground underline underline-offset-4"
              >
                {site.contact.phone}
              </a>
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

/** Consistent section shell: eyebrow, heading, optional link, optional tint. */
function Section({
  eyebrow,
  title,
  action,
  muted = false,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: { href: string; label: string };
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={muted ? "border-t border-border bg-surface" : "border-t border-border"}>
      <div className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              {title}
            </h2>
          </div>

          {action ? (
            <Link
              href={action.href}
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              {action.label} →
            </Link>
          ) : null}
        </div>

        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
