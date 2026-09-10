import { z } from "zod";

import { contentStatusSchema, optionalText } from "./common";

/**
 * Input accepted when creating or updating an FAQ.
 *
 * Categories are a free string on the record, like blog categories: a travel
 * company has half a dozen ("Booking", "Visas", "Kit") and they change once a
 * year, so a taxonomy table would cost more than it returns. The repository
 * derives the list from the records themselves.
 */
export const faqInputSchema = z.object({
  question: z.string().trim().min(1, "The question is required.").max(500),
  answer: z.string().trim().min(1, "The answer is required.").max(10000),
  category: optionalText,
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

export const faqInputWithRulesSchema = faqInputSchema.superRefine(
  (value, ctx) => {
    if (value.status === "scheduled" && !value.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Pick a publication date to schedule this FAQ.",
      });
    }
  },
);

export type FaqInput = z.input<typeof faqInputSchema>;
export type FaqInputParsed = z.output<typeof faqInputSchema>;

/** Query-string parameters for the FAQ list, beyond the shared ones. */
export const faqFiltersSchema = z.object({
  category: z.string().trim().default(""),
});
