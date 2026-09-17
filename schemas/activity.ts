import { richContentSchema } from "./rich-text";
import { z } from "zod";

import {
  bareSlugSchema,
  contentStatusSchema,
  optionalUrl,
} from "./common";
import { seoSchema } from "./seo";
import { embeddedFaqSchema } from "./faq";

/**
 * An icon token, not a file.
 *
 * The frontend maps "mountain-snow" onto whatever icon set it ships, so the
 * CMS stores a name rather than an SVG or a URL. The character restriction is
 * what makes that mapping safe: a pasted image URL fails here, at the point
 * someone can still fix it, instead of reaching the site as a missing glyph.
 */
export const activityIconSchema = z
  .string()
  .trim()
  .transform((value) => (value.length ? value.toLowerCase() : null))
  .nullable()
  .default(null)
  .refine(
    (value) => value === null || /^[a-z0-9][a-z0-9-]{0,63}$/.test(value),
    'Use an icon name such as "mountain-snow" — letters, numbers and hyphens.',
  );

/**
 * Input accepted when creating or updating an activity.
 *
 * Deliberately smaller than a destination: an activity is a label a tour is
 * tagged with ("trekking", "rafting"), not a place with facts of its own. It
 * still carries a slug, SEO and a publication lifecycle because a travel site
 * usually gives each one a landing page.
 */
export const activityInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: bareSlugSchema,
  description: richContentSchema,
  icon: activityIconSchema,
  featuredImage: optionalUrl,
  featuredImageHorizontal: optionalUrl,
  featuredImageVertical: optionalUrl,
  bannerImage: optionalUrl,
  gallery: z.array(z.string().trim()).default([]),
  faqs: z.array(embeddedFaqSchema).max(50).default([]),
  order: z.coerce.number().int().default(0),
  status: contentStatusSchema.default("draft"),
  publishedAt: z
    .string()
    .trim()
    .nullable()
    .default(null)
    .refine(
      (value) => value === null || !Number.isNaN(Date.parse(value)),
      "Publication date is not a valid date.",
    ),
  seo: seoSchema.prefault({}),
});

export const activityInputWithRulesSchema = activityInputSchema.superRefine(
  (value, ctx) => {
    if (value.status === "scheduled" && !value.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Pick a publication date to schedule this activity.",
      });
    }
  },
);

export type ActivityInput = z.input<typeof activityInputSchema>;
export type ActivityInputParsed = z.output<typeof activityInputSchema>;
