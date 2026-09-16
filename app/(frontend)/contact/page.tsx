import type { Metadata } from "next";
import Link from "next/link";

import { EnquiryForm } from "@/components/frontend/enquiry-form";
import { cms } from "@/lib/cms";
import { enquiryPrefillSchema } from "@/schemas/enquiry";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import type { Destination, TourPackage } from "@/types/content";

/**
 * Contact page — a hand-written developer route, and the reference example of
 * the one CMS seam that has no other way in: a public form filing an enquiry.
 *
 * Like the placeholder home page, an editor can manage its title and
 * description by creating a CMS page with the slug "/contact"; the markup here
 * stays the developer's. Replace it wholesale on a real client project.
 *
 * It accepts `?tour=` or `?destination=` so "Enquire about this trip" arrives
 * with the trip already selected and an opening line written, rather than
 * dropping the visitor on an empty form and hoping they retype the name.
 *
 * Rendered per request: the form posts to a Server Action, the tour list beside
 * it should reflect what is on sale today rather than at build time, and the
 * query string above decides what the page says.
 */

export async function generateMetadata(): Promise<Metadata> {
  const [managed, site] = await Promise.all([
    cms.pages.getBySlug("/contact"),
    cms.settings.get(),
  ]);

  return generateCmsMetadata({
    title: managed?.title ?? `Contact ${site.siteName}`,
    path: "/contact",
    description:
      managed?.excerpt ?? "Tell us what you have in mind and we will get back to you.",
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /*
   * A query string is untrusted input like any other, so it is parsed before
   * it reaches a repository (CLAUDE.md, hard rule 2). A value that is not
   * slug-shaped fails the parse and the page falls back to the plain form,
   * which is the honest answer to a link somebody mangled.
   */
  const prefill = enquiryPrefillSchema.safeParse(await searchParams);
  const { tour: tourSlug, destination: destinationSlug } = prefill.success
    ? prefill.data
    : { tour: null, destination: null };

  const [site, tours, tour, destination] = await Promise.all([
    cms.settings.get(),
    cms.tours.getPublished(),
    tourSlug ? cms.tours.getBySlug(tourSlug) : null,
    destinationSlug ? cms.destinations.getBySlug(destinationSlug) : null,
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Get in touch</h1>
        <p className="text-muted-foreground">
          {tour
            ? "Tell us your dates and who is travelling, and we will come back to you with a plan and a price."
            : "Tell us roughly what you have in mind and we will come back to you with a plan and a price."}
        </p>
      </header>

      {site.contact.email || site.contact.phone ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Or reach us directly:{" "}
          {site.contact.email ? (
            <a
              href={`mailto:${site.contact.email}`}
              className="text-foreground underline underline-offset-4"
            >
              {site.contact.email}
            </a>
          ) : null}
          {site.contact.email && site.contact.phone ? " · " : ""}
          {site.contact.phone ? (
            <a
              href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}
              className="text-foreground underline underline-offset-4"
            >
              {site.contact.phone}
            </a>
          ) : null}
        </p>
      ) : null}

      <SubjectCard tour={tour} destination={destination} />

      <div className="mt-10">
        <EnquiryForm
          tours={tours.map(({ id, name }) => ({ id, name }))}
          defaultTourId={tour?.id ?? null}
          destination={
            destination ? { id: destination.id, name: destination.name } : null
          }
          defaultMessage={openingLine(tour, destination)}
        />
      </div>
    </div>
  );
}

/**
 * What the visitor clicked through from, restated on arrival.
 *
 * Worth the extra query: a form that silently preselects a trip looks like it
 * guessed, and a visitor who cannot see what "this trip" resolved to has no way
 * to tell they followed the wrong link.
 */
function SubjectCard({
  tour,
  destination,
}: {
  tour: TourPackage | null;
  destination: Destination | null;
}) {
  if (tour) {
    const facts = [
      tour.durationDays ? `${tour.durationDays} days` : null,
      tour.price !== null
        ? `from ${tour.currency} ${tour.price.toLocaleString()}`
        : null,
      tour.difficulty,
    ].filter(Boolean);

    return (
      <aside className="mt-8 rounded-card bg-card p-5 shadow-[var(--shadow-card)] dark:border dark:border-border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Enquiring about
        </p>
        <Link
          href={`/tours/${tour.slug}`}
          className="mt-1.5 block font-semibold tracking-tight underline-offset-4 hover:underline"
        >
          {tour.name}
        </Link>
        {facts.length > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {facts.join(" · ")}
          </p>
        ) : null}
      </aside>
    );
  }

  if (destination) {
    return (
      <aside className="mt-8 rounded-card bg-card p-5 shadow-[var(--shadow-card)] dark:border dark:border-border">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Enquiring about
        </p>
        <Link
          href={`/destinations/${destination.slug}`}
          className="mt-1.5 block font-semibold tracking-tight underline-offset-4 hover:underline"
        >
          {destination.name}
        </Link>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a trip below, or leave it with us and we will suggest one.
        </p>
      </aside>
    );
  }

  return null;
}

/** The first line of the message box, for a visitor who arrived with context. */
function openingLine(
  tour: TourPackage | null,
  destination: Destination | null,
): string {
  if (tour) {
    return `I'm interested in the ${tour.name}. Could you tell me more about available dates and what the price includes?`;
  }

  if (destination) {
    return `I'm interested in travelling to ${destination.name}. Could you suggest a trip and some dates?`;
  }

  return "";
}
