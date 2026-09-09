/**
 * Block system types.
 *
 * A page's body is an ordered list of blocks. Each block is `{ type, props }`;
 * the shape of `props` is defined by the block's registered Zod schema, so the
 * admin UI can render a form for any block without knowing about it ahead of
 * time. See `lib/cms/blocks.ts` for the registry.
 */
export interface BlockInstance {
  /** Stable id so React keys and drag-reorder survive edits. */
  id: string;
  /** Registered block name, e.g. "hero", "tour-grid". */
  type: string;
  props: Record<string, unknown>;
}

/** Optional grouping layer. A page with no sections is just a flat block list. */
export interface PageSection {
  id: string;
  name: string | null;
  blocks: BlockInstance[];
}

export type PageBody = BlockInstance[];
