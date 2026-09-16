import { z } from "zod";

import {
  ACCOMMODATION_TYPES,
  RATED_ACCOMMODATION_TYPES,
  TOUR_DIFFICULTIES,
} from "@/types/content";

import {
  bareSlugSchema,
  contentStatusSchema,
  optionalNumber,
  optionalText,
  optionalUrl,
} from "./common";
import { monthSchema, stringListSchema } from "./destination";
import { embeddedFaqSchema } from "./faq";
import { richContentSchema } from "./rich-text";
import { seoSchema } from "./seo";

export const tourDifficultySchema = z.enum(TOUR_DIFFICULTIES);

/** The three meals an itinerary day can include. */
export const MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

/**
 * One day of an itinerary.
 *
 * Unlike every other repeating field in the admin, a day is not flat — it
 * carries its own lists of meals, activities and images. Parallel form inputs
 * cannot express that without inventing an encoding, so the itinerary editor
 * posts JSON in a single hidden field and the action parses it before this
 * schema sees it.
 */
/**
 * Accommodation type, from any of the three ways "not set" can arrive.
 *
 * `null` has to be accepted, and that is the whole point of this comment.
 * Every other optional enum in this file is fed by a `<select>`, and a select
 * posts `""` — never `null`, because form data is strings. The itinerary is
 * the exception: it is posted as JSON, which round-trips a stored `null`
 * faithfully. A schema that took only `""` therefore rejected every day with
 * no accommodation set, with Zod's bare "Invalid input" and no clue which
 * field it meant.
 */
export const accommodationTypeSchema = z
  .preprocess(
    // Normalised before the enum sees it, rather than unioned with `""` and
    // `null`: a failing union reports its own bare "Invalid input" and throws
    // away the branch's message, which is exactly the unhelpful error this
    // replaced.
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z
      .enum(ACCOMMODATION_TYPES, {
        message: "Pick one of the listed accommodation types.",
      })
      .optional(),
  )
  .transform((value) => value ?? null);

export const itineraryDaySchema = z
  .object({
    id: z.string().trim().min(1),
    day: z.coerce.number().int().min(1).max(365),
    // Defaulted rather than required: every itinerary written before spans
    // existed holds one-day entries, and rejecting them would mean a content
    // migration on live tours.
    spanDays: z.coerce.number().int().min(1).max(60).default(1),
    title: z.string().trim().min(1, "Every day needs a title.").max(200),
    description: z.string().default(""),
    accommodation: optionalText,
    accommodationType: accommodationTypeSchema,
    accommodationRating: optionalNumber.refine(
      (value) => value === null || (value >= 1 && value <= 5),
      "A rating is between 1 and 5 stars.",
    ),
    meals: z.array(z.string().trim()).default([]),
    activities: z.array(z.string().trim()).default([]),
    images: z.array(z.string().trim()).default([]),
    altitude: optionalNumber,
    duration: optionalText,
  })
  .transform((day) => ({
    ...day,
    // A rating only survives on a type that is actually graded. Dropping it
    // here rather than in the editor means a stale value cannot be smuggled
    // past the form by posting JSON directly.
    accommodationRating: RATED_ACCOMMODATION_TYPES.some(
      (type) => type === day.accommodationType,
    )
      ? day.accommodationRating
      : null,
  }));

/**
 * One per-person rate for a band of party sizes.
 *
 * `maxPeople` empty means "and above". Exactly one tier may be open-ended and
 * it has to be the last one, which the array rules below enforce.
 */
export const groupPriceTierSchema = z.object({
  id: z.string().trim().min(1),
  minPeople: z.coerce
    .number()
    .int()
    .min(1, "A group starts at one person.")
    .max(1000),
  maxPeople: z
    .union([z.coerce.number().int().min(1).max(1000), z.literal("")])
    .nullable()
    .default(null)
    .transform((value) => (value === "" ? null : value)),
  price: z.coerce.number().min(0, "A price cannot be negative."),
});

/**
 * The rate table as a whole.
 *
 * The cross-row rules are the point. A table where two rows both cover a party
 * of five does not have a price for five people, it has two, and whichever the
 * code happens to find first is the one the customer is quoted. That is the
 * defect in every hand-rolled version of this field — including the one this
 * was modelled on, which happily accepts 2-5 alongside 5-8 — so it is caught
 * here rather than left to be discovered by an angry booking.
 *
 * Gaps are allowed on purpose: an operator may price 1-4 and 8+ and settle
 * 5-7 by conversation. `perPersonPrice` falls back to the flat price there.
 */
export const groupPricingSchema = z
  .array(groupPriceTierSchema)
  .max(20, "Twenty bands is already more than a customer will read.")
  .default([])
  .superRefine((tiers, ctx) => {
    tiers.forEach((tier, index) => {
      if (tier.maxPeople !== null && tier.maxPeople < tier.minPeople) {
        ctx.addIssue({
          code: "custom",
          path: [index, "maxPeople"],
          message: "The maximum cannot be below the minimum.",
        });
      }
    });

    // Compared in party-size order, not row order, so an editor who types the
    // bands out of sequence is told about a real overlap rather than an
    // imaginary one.
    const ordered = tiers
      .map((tier, index) => ({ tier, index }))
      .sort((a, b) => a.tier.minPeople - b.tier.minPeople);

    for (let i = 0; i < ordered.length - 1; i += 1) {
      const current = ordered[i];
      const next = ordered[i + 1];

      if (current.tier.maxPeople === null) {
        ctx.addIssue({
          code: "custom",
          path: [current.index, "maxPeople"],
          message:
            "An open-ended band has to be the last one. Give this a maximum.",
        });
        break;
      }

      if (current.tier.maxPeople >= next.tier.minPeople) {
        ctx.addIssue({
          code: "custom",
          path: [next.index, "minPeople"],
          message: `Overlaps the band above, which already covers ${next.tier.minPeople}. Start this one at ${current.tier.maxPeople + 1}.`,
        });
      }
    }
  });

export const tourFaqSchema = embeddedFaqSchema;

/**
 * Input accepted when creating or updating a tour package.
 *
 * Prices are plain display numbers, not minor units: this CMS never processes
 * a payment, and "from $1,450" is what the client types and what the site
 * shows. A booking engine would need minor units and should not reuse these.
 */
export const tourInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: bareSlugSchema,
  shortDescription: optionalText,
  description: richContentSchema,
  featuredImage: optionalUrl,
  gallery: z.array(z.string().trim()).default([]),

  price: optionalNumber.refine(
    (value) => value === null || value >= 0,
    "A price cannot be negative.",
  ),
  compareAtPrice: optionalNumber.refine(
    (value) => value === null || value >= 0,
    "A price cannot be negative.",
  ),
  groupPricing: groupPricingSchema,
  currency: z
    .string()
    .trim()
    .default("USD")
    .transform((value) => (value ? value.toUpperCase() : "USD"))
    .refine(
      (value) => /^[A-Z]{3}$/.test(value),
      "Use a three-letter currency code, e.g. USD or NPR.",
    ),
  priceNote: optionalText,

  durationDays: optionalNumber.refine(
    (value) => value === null || (value >= 1 && value <= 365),
    "Duration must be between 1 and 365 days.",
  ),
  durationNights: optionalNumber.refine(
    (value) => value === null || (value >= 0 && value <= 365),
    "Nights must be between 0 and 365.",
  ),
  difficulty: z
    .union([tourDifficultySchema, z.literal("")])
    .default("")
    .transform((value) => (value === "" ? null : value)),
  groupSizeMin: optionalNumber,
  groupSizeMax: optionalNumber,
  maxAltitude: optionalNumber,

  destinationId: z
    .string()
    .trim()
    .default("")
    .transform((value) => (value ? value : null)),
  activityIds: z.array(z.string().trim()).default([]),

  itinerary: z.array(itineraryDaySchema).max(365).default([]),
  inclusions: stringListSchema,
  exclusions: stringListSchema,
  highlights: stringListSchema,
  faqs: z.array(tourFaqSchema).max(50).default([]),
  bestSeason: z.array(monthSchema).default([]),

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
  seo: seoSchema.prefault({}),
});

export const tourInputWithRulesSchema = tourInputSchema.superRefine(
  (value, ctx) => {
    if (value.status === "scheduled" && !value.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Pick a publication date to schedule this tour.",
      });
    }

    // A strike-through price that is not higher than the real one reads as a
    // mistake to a customer, and in several markets it is also unlawful.
    if (
      value.price !== null &&
      value.compareAtPrice !== null &&
      value.compareAtPrice <= value.price
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["compareAtPrice"],
        message: "The compare-at price must be higher than the price.",
      });
    }

    if (
      value.groupSizeMin !== null &&
      value.groupSizeMax !== null &&
      value.groupSizeMin > value.groupSizeMax
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["groupSizeMax"],
        message: "The maximum group size cannot be below the minimum.",
      });
    }

    // Itineraries are sold as "12 days", so a day list that disagrees with the
    // headline duration is a contradiction a customer will notice.
    if (
      value.durationDays !== null &&
      value.itinerary.length > 0 &&
      value.itinerary.length !== value.durationDays
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["itinerary"],
        message: `The itinerary has ${value.itinerary.length} day${
          value.itinerary.length === 1 ? "" : "s"
        } but the duration says ${value.durationDays}.`,
      });
    }
  },
);

export type TourInput = z.input<typeof tourInputSchema>;
export type TourInputParsed = z.output<typeof tourInputSchema>;

/** Query-string parameters for the tours list, beyond the shared ones. */
export const tourFiltersSchema = z.object({
  destination: z.string().trim().default(""),
  difficulty: z.union([tourDifficultySchema, z.literal("")]).default(""),
  featured: z.enum(["", "yes", "no"]).default(""),
});
