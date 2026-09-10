import type { Metadata } from "next";
import Link from "next/link";

import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";

/**
 * FAQ page — part of the default template.
 *
 * Uses `cms.faqs.getGrouped()`, which returns published questions bucketed by
 * category with the uncategorised ones last. That grouping is a business rule,
 * so it lives in the repository and this page just renders the result.
 *
 * Rendered with `<details>` rather than a JavaScript accordion: it is
 * keyboard-accessible, searchable by the browser's find-in-page, and needs no
 * client component.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [managed, site] = await Promise.all([
    cms.pages.getBySlug("/faqs"),
    cms.settings.get(),
  ]);

  return generateCmsMetadata({
    title: managed?.title ?? "Frequently asked questions",
    path: "/faqs",
    description:
      managed?.excerpt ?? `Common questions about travelling with ${site.siteName}.`,
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

export default async function FaqsPage() {
  const [managed, groups] = await Promise.all([
    cms.pages.getBySlug("/faqs"),
    cms.faqs.getGrouped(),
  ]);

  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Before you ask
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {managed?.title ?? "Frequently asked questions"}
        </h1>
        {managed?.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {managed.excerpt}
          </p>
        ) : null}
      </header>

      {total === 0 ? (
        <p className="mt-16 rounded-card border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
          No questions published yet. Add some in the admin under FAQs.
        </p>
      ) : (
        <div className="mt-14 space-y-12">
          {groups.map((group) => (
            <section key={group.category ?? "general"}>
              <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {group.category ?? "General"}
              </h2>

              <dl className="mt-5 divide-y divide-border border-y border-border">
                {group.items.map((faq) => (
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
            </section>
          ))}
        </div>
      )}

      <aside className="mt-16 rounded-card bg-surface px-6 py-8 text-center dark:border dark:border-border">
        <p className="text-lg font-medium">Still not sure?</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask us directly — we answer every enquiry ourselves.
        </p>
        <Link
          href="/contact"
          className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Get in touch
        </Link>
      </aside>
    </div>
  );
}
