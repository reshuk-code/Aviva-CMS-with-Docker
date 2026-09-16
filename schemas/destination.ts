import { z } from "zod";

import {
  bareSlugSchema,
  contentStatusSchema,
  optionalNumber,
  optionalText,
  optionalUrl,
} from "./common";
import { richContentSchema } from "./rich-text";
import { embeddedFaqSchema } from "./faq";
import { seoSchema } from "./seo";

/** Months, in calendar order — the vocabulary for "best season". */
export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const monthSchema = z.enum(MONTHS);

/** Repeatable text rows arrive as many inputs of the same name. */
export const stringListSchema = z
  .array(z.string())
  .default([])
  .transform((values) =>
    values.map((value) => value.trim()).filter(Boolean).slice(0, 50),
  );

/**
 * Input accepted when creating or updating a destination.
 *
 * Coordinates are validated to real ranges rather than merely "a number": a
 * transposed latitude and longitude is the classic way to put a Nepali valley
 * in the Indian Ocean, and the range check catches half of those.
 */
export const destinationInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  slug: bareSlugSchema,
  shortDescription: optionalText,
  description: richContentSchema,
  featuredImage: optionalUrl,
  gallery: z.array(z.string().trim()).default([]),
  country: optionalText,
  region: optionalText,
  latitude: optionalNumber.refine(
    (value) => value === null || (value >= -90 && value <= 90),
    "Latitude must be between -90 and 90.",
  ),
  longitude: optionalNumber.refine(
    (value) => value === null || (value >= -180 && value <= 180),
    "Longitude must be between -180 and 180.",
  ),
  highlights: stringListSchema,
  faqs: z.array(embeddedFaqSchema).max(50).default([]),
  bestSeason: z.array(monthSchema).default([]),
  typicalDuration: optionalText,
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

export const destinationInputWithRulesSchema =
  destinationInputSchema.superRefine((value, ctx) => {
    if (value.status === "scheduled" && !value.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Pick a publication date to schedule this destination.",
      });
    }

    // One coordinate alone cannot place anything on a map, and a half-filled
    // pair is more likely a slip than an intention.
    const hasLat = value.latitude !== null;
    const hasLng = value.longitude !== null;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: "custom",
        path: [hasLat ? "longitude" : "latitude"],
        message: "Give both coordinates, or neither.",
      });
    }
  });

export type DestinationInput = z.input<typeof destinationInputSchema>;
export type DestinationInputParsed = z.output<typeof destinationInputSchema>;

/** Query-string parameters for the destinations list, beyond the shared ones. */
export const destinationFiltersSchema = z.object({
  country: z.string().trim().default(""),
  featured: z.enum(["", "yes", "no"]).default(""),
});
