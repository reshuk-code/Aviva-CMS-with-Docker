import { z } from "zod";

import { optionalText, optionalUrl } from "./common";

/**
 * SEO metadata is embedded in every publicly addressable entity, so this
 * schema is composed into the page/post/tour/destination schemas rather than
 * duplicated.
 */
export const seoSchema = z.object({
  title: optionalText,
  description: optionalText,
  canonical: optionalUrl,
  robots: z.enum(["index", "noindex"]).default("index"),
  noFollow: z.coerce.boolean().default(false),
  ogTitle: optionalText,
  ogDescription: optionalText,
  ogImage: optionalUrl,
  twitterCard: z.enum(["summary", "summary_large_image"]).default("summary_large_image"),
  structuredData: optionalText.refine((value) => {
    if (value === null) return true;
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }, "Structured data must be valid JSON."),
});

export type SeoInput = z.input<typeof seoSchema>;
