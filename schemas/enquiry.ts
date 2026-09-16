import { z } from "zod";

import { ENQUIRY_STATUSES } from "@/types/content";

import { optionalNumber, optionalText } from "./common";

export const enquiryStatusSchema = z.enum(ENQUIRY_STATUSES);

/**
 * Input accepted from a public contact or booking form.
 *
 * This is the only schema in the CMS parsing input from someone who is not
 * signed in, so it is the strictest: it accepts the traveller's own details
 * and nothing else. `status`, `notes` and the record's timestamps are the
 * inbox's to set — a submitted form that could name its own status could file
 * itself as "converted", and one that could write `notes` could put words in
 * the operator's mouth.
 */
export const enquiryInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  phone: optionalText,
  country: optionalText,
  message: z.string().trim().min(1, "Message is required.").max(5000),
  subjectType: optionalText,
  subjectId: optionalText,
  travelDate: z
    .string()
    .trim()
    .transform((value) => (value.length ? value : null))
    .nullable()
    .default(null)
    .refine(
      (value) => value === null || !Number.isNaN(Date.parse(value)),
      "Travel date is not a valid date.",
    ),
  travellers: optionalNumber.refine(
    (value) => value === null || (value > 0 && value <= 100),
    "Give a number of travellers between 1 and 100.",
  ),
  source: optionalText,
});

export type EnquiryInput = z.input<typeof enquiryInputSchema>;
export type EnquiryInputParsed = z.output<typeof enquiryInputSchema>;

/**
 * What the inbox itself may change. Deliberately not the traveller's words:
 * an enquiry is a record of what someone actually sent, so the admin triages
 * it rather than edits it.
 */
export const enquiryUpdateSchema = z.object({
  status: enquiryStatusSchema,
  notes: optionalText,
});

export type EnquiryUpdateParsed = z.output<typeof enquiryUpdateSchema>;

/**
 * The query string that preselects what a visitor is enquiring about, e.g.
 * /contact?tour=everest-base-camp.
 *
 * A URL anybody can edit, so it is parsed like any other untrusted input. A
 * value that is not slug-shaped is rejected outright rather than looked up:
 * the page falls back to a plain contact form, which is the honest response to
 * a link somebody mangled.
 */
const prefillSlug = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .transform((value) => (value.length ? value : null))
  .nullable()
  .default(null)
  .refine(
    (value) => value === null || /^[a-z0-9-]+$/.test(value),
    "Not a slug.",
  );

export const enquiryPrefillSchema = z.object({
  tour: prefillSlug,
  destination: prefillSlug,
});

export type EnquiryPrefill = z.output<typeof enquiryPrefillSchema>;

/** Query-string parameters for the enquiries list. */
export const enquiryFiltersSchema = z.object({
  status: z.union([enquiryStatusSchema, z.literal("any")]).default("any"),
});
