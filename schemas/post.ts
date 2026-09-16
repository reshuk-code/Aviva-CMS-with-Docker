import { z } from "zod";

import {
  bareSlugSchema,
  contentStatusSchema,
  optionalText,
  optionalUrl,
} from "./common";
import { blockInstanceSchema } from "./page";
import { richContentSchema } from "./rich-text";
import { seoSchema } from "./seo";

/** Comma-separated tags in, a de-duplicated array out. */
export const tagsSchema = z
  .string()
  .trim()
  .default("")
  .transform((value) =>
    [
      ...new Set(
        value
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ].slice(0, 20),
  );

/**
 * Input accepted when creating or updating a blog post.
 *
 * `readingMinutes` is absent on purpose: it is derived from the content by the
 * repository, so it can never disagree with the words actually stored.
 */
export const postInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  slug: bareSlugSchema,
  excerpt: optionalText,
  content: richContentSchema,
  body: z.array(blockInstanceSchema).default([]),
  featuredImage: optionalUrl,
  authorId: z.string().trim().nullable().default(null),
  category: optionalText,
  tags: tagsSchema,
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
});

export const postInputWithRulesSchema = postInputSchema.superRefine(
  (value, ctx) => {
    if (value.status === "scheduled" && !value.publishedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Pick a publication date to schedule this post.",
      });
    }
  },
);

export type PostInput = z.input<typeof postInputSchema>;
export type PostInputParsed = z.output<typeof postInputSchema>;

/** Query-string parameters for the blog list, on top of the shared ones. */
export const postFiltersSchema = z.object({
  category: z.string().trim().default(""),
  tag: z.string().trim().default(""),
});
