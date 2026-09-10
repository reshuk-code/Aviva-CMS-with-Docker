import { z } from "zod";

import { contentStatusSchema, optionalText, optionalUrl } from "./common";

/**
 * Input accepted when creating or updating a testimonial.
 *
 * No slug and no SEO block: a review is never a page of its own. It is a quote
 * rendered inside someone else's page, so giving it a URL would invite thin
 * duplicate content that a search engine reads as spam.
 */
export const testimonialInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  image: optionalUrl,
  rating: z.coerce
    .number()
    .int("Give a whole number of stars.")
    .min(1, "Ratings run from 1 to 5.")
    .max(5, "Ratings run from 1 to 5.")
    .default(5),
  message: z.string().trim().min(1, "The quote is required.").max(5000),
  position: optionalText,
  company: optionalText,
  country: optionalText,
  tourId: optionalText,
  featured: z.coerce.boolean().default(false),
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
});

export const testimonialInputWithRulesSchema =
  testimonialInputSchema.superRefine((value, ctx) => {
    if (value.status === "scheduled" && !value.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Pick a publication date to schedule this testimonial.",
      });
    }

    // A testimonial with an attributed company but no person reads as a logo,
    // not a review. Cheap to catch here; confusing to discover on the homepage.
    if (value.company && !value.position && value.name.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Give the person's name, not just the company.",
      });
    }
  });

export type TestimonialInput = z.input<typeof testimonialInputSchema>;
export type TestimonialInputParsed = z.output<typeof testimonialInputSchema>;

/** Query-string parameters for the testimonials list, beyond the shared ones. */
export const testimonialFiltersSchema = z.object({
  rating: z.enum(["", "1", "2", "3", "4", "5"]).default(""),
  featured: z.enum(["", "yes", "no"]).default(""),
});
