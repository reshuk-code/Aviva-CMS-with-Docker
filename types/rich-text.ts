/**
 * Rich text document types.
 *
 * The editor stores a ProseMirror document — the shape TipTap emits — rather
 * than HTML. That is a security decision as much as a data one: the renderer
 * walks this tree and builds React elements from it, so there is no point at
 * which editor-authored content becomes markup. No parser, no sanitiser, and
 * no `dangerouslySetInnerHTML` anywhere in the content path.
 *
 * Storage-agnostic by design: a document is serialised to a JSON string and
 * kept in the same `content` / `description` string field it always used, so
 * no adapter, table or collection changed shape when rich text landed.
 */

/** Inline formatting applied to a run of text. */
export interface RichMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/** One node of the document tree. Leaf text nodes carry `text`. */
export interface RichNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
}

/** The document root. Always `type: "doc"`. */
export interface RichDoc {
  type: "doc";
  content: RichNode[];
}

/**
 * Node types the editor can produce and the renderer knows how to draw.
 *
 * The renderer skips anything absent from this list rather than throwing, the
 * same way the block renderer skips an unregistered block: enabling a new
 * TipTap extension without updating this list degrades to missing content, not
 * a broken page.
 */
export const RICH_NODE_TYPES = [
  "doc",
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "table",
  "tableRow",
  "tableCell",
  "tableHeader",
  "video",
  "image",
  "text",
] as const;

/** Marks the toolbar can apply. `link` is the only one carrying an attribute. */
export const RICH_MARK_TYPES = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
] as const;

/**
 * Heading levels offered in the editor.
 *
 * Starts at 2 because the page or post title is the document's only `h1`; an
 * editor who could insert a second one would quietly damage the page outline
 * and its SEO.
 */
export const RICH_HEADING_LEVELS = [2, 3, 4] as const;

/**
 * A field that is now one rich text document but used to be a list of them.
 *
 * Highlights, inclusions and exclusions were each a `string[]` of one-line
 * entries edited through a row-per-item control. They are now a single editor
 * where the writer makes their own bulleted, numbered or unformatted list,
 * because "included" is prose with structure, not a set of records — nothing
 * ever queried an individual row.
 *
 * The array form stays in the type rather than being migrated away: every tour
 * a client has already written holds one, and rewriting live prose in place is
 * a worse risk than reading two shapes. `toRichListContent()` in
 * `lib/rich-text.ts` folds an old array into a bullet list, and is the only
 * thing that should ever look at which shape a value is.
 */
export type RichListContent = string | string[];

export const EMPTY_RICH_DOC: RichDoc = { type: "doc", content: [] };
