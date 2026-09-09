import { z } from "zod";

import { contentStatusSchema, optionalText, optionalUrl, slugSchema } from "./common";
import { seoSchema } from "./seo";

export const blockInstanceSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Input accepted when creating or updating a page.
 *
 * Note what is NOT here: id, createdAt, updatedAt, updatedBy. Those are owned
 * by the store and the session, never by the submitted form.
 */
export const pageInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: slugSchema,
  excerpt: optionalText,
  body: z.array(blockInstanceSchema).default([]),
  featuredImage: optionalUrl,
  parentId: z.string().trim().nullable().default(null),
  order: z.coerce.number().int().default(0),
  showInNavigation: z.coerce.boolean().default(false),
  template: optionalText,
  status: contentStatusSchema.default("draft"),
  /** Required when status is "scheduled"; ignored otherwise. */
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
  meta: z.record(z.string(), z.string()).default({}),
});

export const pageInputWithRulesSchema = pageInputSchema.superRefine(
  (value, ctx) => {
    if (value.status === "scheduled" && !value.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Pick a publication date to schedule this page.",
      });
    }
    if (value.parentId && value.slug === "/") {
      ctx.addIssue({
        code: "custom",
        path: ["parentId"],
        message: "The home page cannot have a parent.",
      });
    }
  },
);

export type PageInput = z.input<typeof pageInputSchema>;
export type PageInputParsed = z.output<typeof pageInputSchema>;
