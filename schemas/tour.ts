import { z } from "zod";

import { TOUR_DIFFICULTIES } from "@/types/content";

import {
  bareSlugSchema,
  contentStatusSchema,
  optionalNumber,
  optionalText,
  optionalUrl,
} from "./common";
import { monthSchema, stringListSchema } from "./destination";
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
export const itineraryDaySchema = z.object({
  id: z.string().trim().min(1),
  day: z.coerce.number().int().min(1).max(365),
  title: z.string().trim().min(1, "Every day needs a title.").max(200),
  description: z.string().default(""),
  accommodation: optionalText,
  meals: z.array(z.string().trim()).default([]),
  activities: z.array(z.string().trim()).default([]),
  images: z.array(z.string().trim()).default([]),
  altitude: optionalNumber,
  duration: optionalText,
});

export const tourFaqSchema = z.object({
  id: z.string().trim().min(1),
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1),
});

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
  description: z.string().default(""),
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
