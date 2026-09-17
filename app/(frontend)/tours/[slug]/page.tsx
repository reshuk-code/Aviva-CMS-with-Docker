import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PreviewBanner } from "@/components/frontend/preview-banner";
import { EmbeddedFaqs } from "@/components/frontend/embedded-faqs";
import { RichListText, RichText } from "@/components/frontend/rich-text";
import { pickImage } from "@/lib/images";
import { isEmptyRichList } from "@/lib/rich-text";
import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import { pluralise } from "@/lib/utils";
import { GroupPriceCalculator } from "@/components/frontend/group-price-calculator";
import { lowestPrice } from "@/lib/pricing";
import type { AccommodationType, TourPackage } from "@/types/content";

/**
 * One tour package — the richest page in the default template.
 *
 * A tour is what the client actually sells, so everything a customer compares
 * before booking is a structured field rather than prose: price, length,
 * difficulty, what is and is not included, and the day-by-day itinerary. This
 * page renders each of those from its own field, which is the whole reason the
 * CMS stores them separately.
 */
export const revalidate = 300;

async function resolveTour(slug: string): Promise<TourPackage | null> {
  const { isEnabled } = await draftMode();
  return isEnabled
    ? cms.tours.getBySlugIncludingDrafts(slug)
    : cms.tours.getBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tour = await resolveTour(slug);

  if (!tour) return { title: "Not found" };

  return generateCmsMetadata({
    title: tour.name,
    path: `/tours/${tour.slug}`,
    description: tour.shortDescription,
    image: pickImage(tour, "banner"),
    seo: tour.seo,
  });
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tour = await resolveTour(slug);

  if (!tour) notFound();

  const heroImage = pickImage(tour, "banner");

  const { isEnabled: previewing } = await draftMode();

  // The tour stores ids; resolve them to names. A destination or activity that
  // has since been deleted simply drops out — the CMS has no referential
  // integrity and this page does not pretend otherwise.
  const [destination, activities, reviews] = await Promise.all([
    tour.destinationId ? cms.destinations.get(tour.destinationId) : null,
    cms.activities.byIds(tour.activityIds),
    cms.testimonials.getByTour(tour.id, 3),
  ]);

  // The cheapest rate on offer, which is a group rate whenever one is set.
  const headline = lowestPrice(tour);

  return (
    <>
      {previewing ? (
        <PreviewBanner status={tour.status} path={`/tours/${tour.slug}`} />
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

          <div className="relative mx-auto w-full max-w-5xl px-6 py-24 sm:py-32">
            <nav className="mb-6 text-sm">
              <Link
                href="/tours"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                ← All trips
              </Link>
            </nav>

            {destination ? (
              <Link
                href={`/destinations/${destination.slug}`}
                className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
              >
                {destination.name}
              </Link>
            ) : null}

            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {tour.name}
            </h1>

            {tour.shortDescription ? (
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {tour.shortDescription}
              </p>
            ) : null}

            {activities.length > 0 ? (
              <ul className="mt-7 flex flex-wrap gap-2">
                {activities.map((activity) => (
                  <li key={activity.id}>
                    <Link
                      href={`/activities/${activity.slug}`}
                      className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs backdrop-blur transition-colors hover:border-foreground/30"
                    >
                      {activity.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-6 py-14">
          <SpecRow tour={tour} />

          <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_18rem] lg:items-start">
            <div className="min-w-0 space-y-14">
              {tour.description ? (
                <section>
                  <div className="leading-relaxed [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold">
                    <RichText content={tour.description} />
                  </div>
                </section>
              ) : null}

              {tour.tripInfo && <section className="space-y-4"><h2 className="text-2xl font-semibold">Trip information</h2><RichText content={tour.tripInfo} /></section>}
              {!isEmptyRichList(tour.highlights) ? (
                <section>
                  <SectionHeading>Highlights</SectionHeading>
                  <div className="mt-5 text-sm leading-relaxed">
                    <RichListText content={tour.highlights} />
                  </div>
                </section>
              ) : null}

              {tour.itinerary.length > 0 ? (
                <section>
                  <SectionHeading>Day by day</SectionHeading>
                  <ol className="mt-6 space-y-0">
                    {tour.itinerary.map((day) => (
                      <li
                        key={day.id}
                        className="relative border-l border-border pb-8 pl-8 last:pb-0"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-1 -translate-x-1/2 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium tabular-nums"
                        >
                          {dayLabel(day)}
                        </span>

                        <h3 className="font-semibold leading-snug tracking-tight">
                          {day.title}
                        </h3>

                        {day.description ? (
                          <div className="mt-2 text-sm leading-relaxed text-muted-foreground"><RichText content={day.description} /></div>
                        ) : null}

                        <DayFacts day={day} />

                        {day.images.length > 0 ? (
                          <ul className="mt-4 flex flex-wrap gap-3">
                            {day.images.map((url) => (
                              <li
                                key={url}
                                className="overflow-hidden rounded-md border border-border"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt=""
                                  loading="lazy"
                                  data-lightbox
                                  className="size-24 object-cover"
                                />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {!isEmptyRichList(tour.inclusions) ||
              !isEmptyRichList(tour.exclusions) ? (
                <section>
                  <SectionHeading>What is included</SectionHeading>
                  <div className="mt-5 grid gap-8 sm:grid-cols-2">
                    {!isEmptyRichList(tour.inclusions) ? (
                      <div>
                        <h3 className="text-sm font-medium">Included</h3>
                        <div className="mt-3 text-sm leading-relaxed">
                          <RichListText content={tour.inclusions} />
                        </div>
                      </div>
                    ) : null}

                    {!isEmptyRichList(tour.exclusions) ? (
                      <div>
                        <h3 className="text-sm font-medium">Not included</h3>
                        <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          <RichListText content={tour.exclusions} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {tour.gallery.length > 0 ? (
                <section>
                  <SectionHeading>Gallery</SectionHeading>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {tour.gallery.map((url) => (
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

              <EmbeddedFaqs faqs={tour.faqs} heading="Questions about this trip" />

              {reviews.length > 0 ? (
                <section>
                  <SectionHeading>What travellers said</SectionHeading>
                  <ul className="mt-6 space-y-5">
                    {reviews.map((review) => (
                      <li
                        key={review.id}
                        className="rounded-card bg-card p-5 shadow-[var(--shadow-card)] dark:border dark:border-border"
                      >
                        <p
                          className="text-amber-500"
                          aria-label={`${review.rating} out of 5`}
                        >
                          {"★".repeat(review.rating)}
                          <span className="text-muted-foreground/40">
                            {"★".repeat(5 - review.rating)}
                          </span>
                        </p>
                        <blockquote className="mt-3 text-sm leading-relaxed">
                          “{review.message}”
                        </blockquote>
                        <p className="mt-3 text-xs text-muted-foreground">
                          {[review.name, review.country].filter(Boolean).join(" · ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {/* ------------------------------------------------ booking box */}
            <aside className="lg:sticky lg:top-8">
              <div className="rounded-card bg-card p-6 shadow-[var(--shadow-card)] dark:border dark:border-border">
                {headline !== null ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      From
                    </p>
                    <p className="mt-1">
                      <span className="text-3xl font-semibold">
                        {tour.currency} {headline.toLocaleString()}
                      </span>
                      {tour.compareAtPrice !== null &&
                      tour.compareAtPrice > headline ? (
                        <span className="ml-2 text-sm text-muted-foreground line-through">
                          {tour.currency} {tour.compareAtPrice.toLocaleString()}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {/* The note usually opens with "Per person, ...", so the
                          label is only added when it is actually missing. */}
                      {tour.priceNote
                        ? /per person/i.test(tour.priceNote)
                          ? tour.priceNote
                          : `per person · ${tour.priceNote}`
                        : "per person"}
                    </p>

                    <GroupPriceCalculator
                      tiers={tour.groupPricing}
                      basePrice={tour.price}
                      currency={tour.currency}
                      groupSizeMin={tour.groupSizeMin}
                      groupSizeMax={tour.groupSizeMax}
                    />
                  </>
                ) : (
                  <p className="text-sm font-medium">Price on request</p>
                )}

                {/* Carries the trip through so the form arrives preselected,
                    with an opening line already written. */}
                <Link
                  href={`/contact?tour=${encodeURIComponent(tour.slug)}`}
                  className="mt-5 block rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground"
                >
                  Enquire about this trip
                </Link>

                {tour.bestSeason.length > 0 ? (
                  <div className="mt-6 border-t border-border pt-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Best months
                    </p>
                    <p className="mt-1.5 text-sm">
                      {tour.bestSeason.map((m) => m.slice(0, 3)).join(", ")}
                    </p>
                  </div>
                ) : null}

                {destination ? (
                  <div className="mt-6 border-t border-border pt-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Destination
                    </p>
                    <Link
                      href={`/destinations/${destination.slug}`}
                      className="mt-1.5 block text-sm underline-offset-4 hover:underline"
                    >
                      {destination.name}
                    </Link>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
      {children}
    </h2>
  );
}

/** The comparison numbers, each omitted when the editor left it blank. */
function SpecRow({ tour }: { tour: TourPackage }) {
  const duration =
    tour.durationDays && tour.durationNights
      ? `${pluralise(tour.durationDays, "day")} / ${pluralise(tour.durationNights, "night")}`
      : tour.durationDays
        ? pluralise(tour.durationDays, "day")
        : null;

  const groupSize =
    tour.groupSizeMin && tour.groupSizeMax
      ? `${tour.groupSizeMin}–${tour.groupSizeMax} people`
      : tour.groupSizeMax
        ? `Up to ${tour.groupSizeMax}`
        : tour.groupSizeMin
          ? `From ${tour.groupSizeMin}`
          : null;

  const specs = [
    { label: "Duration", value: duration, capitalise: false },
    // Difficulty is the only stored-lowercase value here, so it is the only
    // one that wants text-transform. Applying it to the row would render
    // "1 Day / 14 Nights".
    { label: "Difficulty", value: tour.difficulty, capitalise: true },
    { label: "Group size", value: groupSize, capitalise: false },
    {
      label: "Max altitude",
      value: tour.maxAltitude ? `${tour.maxAltitude.toLocaleString()} m` : null,
      capitalise: false,
    },
  ].filter((spec) => Boolean(spec.value));

  if (specs.length === 0) return null;

  return (
    <dl className="grid gap-6 border-y border-border py-6 sm:grid-cols-4">
      {specs.map((spec) => (
        <div key={spec.label}>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {spec.label}
          </dt>
          <dd
            className={
              spec.capitalise
                ? "mt-1 text-sm font-medium capitalize"
                : "mt-1 text-sm font-medium"
            }
          >
            {spec.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Human labels for the stored accommodation vocabulary. */
const ACCOMMODATION_LABELS: Record<AccommodationType, string> = {
  hotel: "Hotel",
  "tea-house": "Tea house",
  "guest-house": "Guest house",
  lodge: "Lodge",
  resort: "Resort",
  homestay: "Homestay",
  camping: "Camping",
  other: "Other",
};

/** "3" for a single day, "3-5" when the entry covers a block. */
function dayLabel(day: TourPackage["itinerary"][number]): string {
  const span = Math.max(1, day.spanDays || 1);
  return span === 1 ? String(day.day) : `${day.day}–${day.day + span - 1}`;
}

/**
 * The accommodation as one phrase: name, type and stars, in whichever
 * combination the editor actually filled in.
 *
 * The type is dropped when the name already says it. Operators write "Lodge in
 * Namche Bazaar", and appending the category to that produces "Lodge in Namche
 * Bazaar (Lodge)", which reads like a bug because it is one.
 */
function stayLabel(day: TourPackage["itinerary"][number]): string | null {
  const type = day.accommodationType
    ? ACCOMMODATION_LABELS[day.accommodationType]
    : null;

  const name = day.accommodation;
  const head = name ?? type;
  if (!head) return null;

  // Spacing is ignored on both sides: operators write "Teahouse in Phakding"
  // and the vocabulary says "Tea house", and those are the same word.
  const squash = (value: string) => value.toLowerCase().replace(/[\s-]+/g, "");
  const alreadyNamed =
    name !== null && type !== null && squash(name).includes(squash(type));

  const qualifier = [
    name && type && !alreadyNamed ? type : null,
    day.accommodationRating ? "★".repeat(day.accommodationRating) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return qualifier ? `${head} (${qualifier})` : head;
}

/** Accommodation, meals, altitude and walking time for one itinerary day. */
function DayFacts({ day }: { day: TourPackage["itinerary"][number] }) {
  const facts = [
    day.duration,
    day.altitude ? `${day.altitude.toLocaleString()} m` : null,
    stayLabel(day),
    day.meals.length > 0 ? day.meals.join(", ") : null,
  ].filter(Boolean);

  if (facts.length === 0) return null;

  return (
    <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {facts.map((fact) => (
        <span key={fact}>{fact}</span>
      ))}
    </p>
  );
}
