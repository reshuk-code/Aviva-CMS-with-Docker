import "server-only";

import type { TourFaq } from "@/types/content";

/** Category headings sort alphabetically, followed by general questions. */
export function groupEmbeddedFaqs(faqs: TourFaq[]): { category: string | null; items: TourFaq[] }[] {
  const groups = new Map<string, TourFaq[]>();
  const general: TourFaq[] = [];

  for (const faq of faqs) {
    const category = faq.category?.trim();
    if (!category) {
      general.push(faq);
      continue;
    }
    const items = groups.get(category);
    if (items) items.push(faq);
    else groups.set(category, [faq]);
  }

  const grouped = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, items]) => ({ category: category as string | null, items }));
  if (general.length) grouped.push({ category: null, items: general });
  return grouped;
}
