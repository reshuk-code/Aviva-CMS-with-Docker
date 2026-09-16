import type { RichDoc, RichNode } from "@/types/rich-text";
import { EMPTY_RICH_DOC } from "@/types/rich-text";

/**
 * Rich text helpers, shared by the editor (browser), the renderer (server) and
 * the post repository (server). Deliberately free of `server-only` and of any
 * import that is not a plain type: all three callers need the same answers.
 *
 * The one rule worth stating: nothing here ever produces a string of HTML.
 * `markdownToDoc` converts legacy prose into the same node tree the editor
 * emits, so the renderer has exactly one code path to draw and there is no
 * second, laxer way for content to reach a page.
 */

/**
 * Links the CMS will follow.
 *
 * Anything else — `javascript:` above all — is dropped rather than rejected, so
 * a pasted document with one bad link still saves and still renders; the link
 * simply becomes plain text. Mirrors the rule the Markdown renderer has always
 * applied to `[text](href)`.
 */
export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string") return false;
  return /^https?:\/\//i.test(href) || href.startsWith("/") || href.startsWith("#");
}

/**
 * Image sources the CMS will render.
 *
 * `data:` is refused on purpose, and it is the whole reason images are uploaded
 * rather than embedded: a pasted screenshot arrives as a base64 data URI, and
 * inlining one would put megabytes into a database row and blow the size cap in
 * `schemas/rich-text.ts`. Editor images always become a media library URL.
 */
export function isSafeImageSrc(src: unknown): src is string {
  if (typeof src !== "string") return false;
  return /^https?:\/\//i.test(src) || src.startsWith("/");
}

/**
 * Reads a stored value into a document.
 *
 * Returns null for anything that is not a serialised document, which is how a
 * field written before the rich editor existed is recognised: it is Markdown,
 * and the caller converts it instead.
 */
export function parseRichDoc(value: string): RichDoc | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as RichDoc).type === "doc" &&
      Array.isArray((parsed as RichDoc).content)
    ) {
      return parsed as RichDoc;
    }
  } catch {
    // Not JSON. Treated as Markdown by the caller, which is the correct
    // reading of a field written before this editor existed.
  }

  return null;
}

/** Any stored content as a document, converting legacy Markdown on the way. */
export function toRichDoc(value: string | null | undefined): RichDoc {
  if (!value || !value.trim()) return EMPTY_RICH_DOC;
  return parseRichDoc(value) ?? markdownToDoc(value);
}

/**
 * The same document, guaranteed to hold at least one paragraph.
 *
 * ProseMirror renders a document with no nodes as nothing at all — not even an
 * empty paragraph — and Tiptap's placeholder decorates an *empty paragraph*.
 * An editor opened on a truly empty document therefore shows no placeholder
 * and gives the caret nothing to land in. Only the editor wants this shape;
 * the renderer keeps using the empty one, which correctly draws nothing.
 */
export function toEditableRichDoc(value: string | null | undefined): RichDoc {
  const doc = toRichDoc(value);
  if (doc.content.length > 0) return doc;
  return { type: "doc", content: [{ type: "paragraph" }] };
}

/** True when the value holds no renderable text. */
export function isEmptyRichContent(value: string | null | undefined): boolean {
  return richDocToPlainText(toRichDoc(value)).trim().length === 0;
}

/* ------------------------------------------------------------- plain text */

/**
 * The document's words, with block boundaries preserved as newlines.
 *
 * Used for the blog's reading time. Counting words in the raw stored string
 * would count `{"type":"doc","content":…` as prose and report a two-minute read
 * for an empty post.
 */
export function richDocToPlainText(doc: RichDoc): string {
  const parts: string[] = [];

  function walk(node: RichNode): void {
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
      return;
    }

    if (node.type === "hardBreak") {
      parts.push("\n");
      return;
    }

    for (const child of node.content ?? []) walk(child);

    // Block-level nodes end with a break so two paragraphs do not run their
    // last and first words together into one.
    if (node.type !== "text") parts.push("\n");
  }

  for (const node of doc.content) walk(node);

  return parts.join("").replace(/\n{2,}/g, "\n").trim();
}

/* --------------------------------------------------------------- Markdown */

/**
 * Converts the Markdown subset the CMS accepted before the rich editor into
 * the editor's own node tree.
 *
 * Supported, unchanged from the original renderer: `#`/`##`/`###` headings,
 * `-` bullets, `1.` numbered lists, blank-line paragraphs, `**bold**`,
 * `*italic*` and `[text](href)`.
 *
 * Headings start at level 2 because the page title owns the only `h1`.
 */
export function markdownToDoc(markdown: string): RichDoc {
  const chunks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const content: RichNode[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      content.push({
        type: "heading",
        attrs: { level: heading[1].length + 1 },
        content: inlineToNodes(heading[2]),
      });
      continue;
    }

    const lines = trimmed.split("\n").map((line) => line.trim());

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      content.push(
        listNode("bulletList", lines, /^[-*]\s+/),
      );
      continue;
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      content.push(
        listNode("orderedList", lines, /^\d+\.\s+/),
      );
      continue;
    }

    content.push({ type: "paragraph", content: inlineToNodes(lines.join(" ")) });
  }

  return { type: "doc", content };
}

function listNode(type: string, lines: string[], marker: RegExp): RichNode {
  return {
    type,
    content: lines.map((line) => ({
      type: "listItem",
      content: [
        { type: "paragraph", content: inlineToNodes(line.replace(marker, "")) },
      ],
    })),
  };
}

/** Tokenises bold, italic and links into marked text nodes. */
function inlineToNodes(text: string): RichNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  const parts = text.split(pattern).filter((part) => part !== "");
  const nodes: RichNode[] = [];

  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(textNode(part.slice(2, -2), [{ type: "bold" }]));
      continue;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      nodes.push(textNode(part.slice(1, -1), [{ type: "italic" }]));
      continue;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      nodes.push(
        isSafeHref(href)
          ? textNode(label, [{ type: "link", attrs: { href } }])
          : textNode(label),
      );
      continue;
    }

    nodes.push(textNode(part));
  }

  return nodes.filter((node) => node.text !== "");
}

function textNode(text: string, marks?: RichNode["marks"]): RichNode {
  return marks ? { type: "text", text, marks } : { type: "text", text };
}
