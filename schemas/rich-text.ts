import { z } from "zod";

import { RICH_MARK_TYPES, RICH_NODE_TYPES } from "@/types/rich-text";
import type { RichNode } from "@/types/rich-text";

/**
 * Validation for a rich text field.
 *
 * The renderer builds React elements from this tree and never emits markup, so
 * this schema is not what stops an injection — nothing downstream can be
 * injected into. What it does stop is a crafted payload becoming *stored*
 * state: an unbounded nesting depth, a node type nobody renders, or a document
 * large enough to be a denial of service against the JSON store.
 *
 * A field that is not JSON is accepted unchanged. That is deliberate: every
 * page, post, destination and tour written before the editor landed holds
 * Markdown, and the renderer converts those on read. Rejecting them would mean
 * a content migration, and a migration that touches a client's live prose is a
 * worse risk than reading two formats.
 */

/** Guards against a pathological document flattening the store. */
const MAX_CONTENT_BYTES = 512 * 1024;

/** Deep enough for nested lists and quotes; shallow enough to bound recursion. */
const MAX_DEPTH = 24;

const markSchema = z.object({
  type: z.enum(RICH_MARK_TYPES),
  attrs: z.record(z.string(), z.unknown()).optional(),
});

const nodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z.object({
    type: z.enum(RICH_NODE_TYPES),
    attrs: z.record(z.string(), z.unknown()).optional(),
    content: z.array(nodeSchema).optional(),
    marks: z.array(markSchema).optional(),
    text: z.string().optional(),
  }),
);

const docSchema = z.object({
  type: z.literal("doc"),
  content: z.array(nodeSchema).default([]),
});

function depthOf(node: RichNode, depth = 1): number {
  const children = node.content ?? [];
  if (children.length === 0) return depth;
  return Math.max(...children.map((child) => depthOf(child, depth + 1)));
}

/**
 * A rich text field as posted by the editor: a serialised document, or legacy
 * Markdown. Returns the value to store, normalised but never reformatted.
 */
export const richContentSchema = z
  .string()
  .default("")
  .superRefine((value, ctx) => {
    if (value.length > MAX_CONTENT_BYTES) {
      ctx.addIssue({
        code: "custom",
        message: "This content is too long to store. Split it across pages.",
      });
      return;
    }

    const trimmed = value.trim();
    // Anything that is not a JSON object is legacy Markdown, which needs no
    // structural check — the renderer parses it into the same tree on read.
    if (!trimmed.startsWith("{")) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "The editor sent content it could not save. Reload and retry.",
      });
      return;
    }

    const result = docSchema.safeParse(parsed);
    if (!result.success) {
      ctx.addIssue({
        code: "custom",
        message: "This content contains formatting the CMS does not support.",
      });
      return;
    }

    if (depthOf({ type: "doc", content: result.data.content }) > MAX_DEPTH) {
      ctx.addIssue({
        code: "custom",
        message: "This content is nested too deeply.",
      });
    }
  });
