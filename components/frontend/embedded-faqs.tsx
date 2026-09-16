import { groupEmbeddedFaqs } from "@/lib/cms/repositories/faq-groups";
import { RichText } from "@/components/frontend/rich-text";
import type { TourFaq } from "@/types/content";

export function EmbeddedFaqs({ faqs, heading }: { faqs?: TourFaq[]; heading: string }) {
  if (!faqs?.length) return null;

  return (
    <section className="mt-16">
      <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {heading}
      </h2>
      <div className="mt-6 space-y-8">
        {groupEmbeddedFaqs(faqs).map((group) => (
          <div key={group.category ?? "general"}>
            <h3 className="text-sm font-semibold text-muted-foreground">
              {group.category ?? "General questions"}
            </h3>
            <dl className="mt-3 divide-y divide-border border-y border-border">
              {group.items.map((faq) => (
                <div key={faq.id} className="py-5">
                  <dt className="font-medium">{faq.question}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    <RichText content={faq.answer} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
