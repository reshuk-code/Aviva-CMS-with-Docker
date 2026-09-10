import type { Metadata } from "next";

import { EnquiryForm } from "@/components/frontend/enquiry-form";
import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";

/**
 * Contact page — a hand-written developer route, and the reference example of
 * the one CMS seam that has no other way in: a public form filing an enquiry.
 *
 * Like the placeholder home page, an editor can manage its title and
 * description by creating a CMS page with the slug "/contact"; the markup here
 * stays the developer's. Replace it wholesale on a real client project.
 *
 * Not statically rendered: the form posts to a Server Action, and the tour list
 * beside it should reflect what is on sale today rather than at build time.
 */
export const revalidate = 300;

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

export default async function ContactPage() {
  const [site, tours] = await Promise.all([
    cms.settings.get(),
    cms.tours.getPublished(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Get in touch</h1>
        <p className="text-muted-foreground">
          Tell us roughly what you have in mind and we will come back to you
          with a plan and a price.
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

      <div className="mt-10">
        <EnquiryForm
          tours={tours.map(({ id, name }) => ({ id, name }))}
        />
      </div>
    </div>
  );
}
