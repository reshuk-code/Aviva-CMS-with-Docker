import { z } from "zod";

import type { BlockInstance } from "@/types/blocks";

/**
 * Block registry.
 *
 * A block is a named component plus a Zod schema for its props. The admin can
 * therefore render an editor for any block — including ones a project adds —
 * without the CMS knowing about it in advance (§8).
 *
 * Phase 1 ships exactly one block: `rich-text`. That is deliberate. A page
 * needs a body to be useful, but a drag-and-drop builder before the CMS
 * foundation is solid is the mistake §28 warns about. Phase 3 adds hero,
 * gallery, tour-grid and the rest on top of this registry, unchanged.
 *
 * Registering a custom block from a project:
 *
 *   registerBlock({
 *     name: "tour-grid",
 *     label: "Tour grid",
 *     schema: z.object({ limit: z.number().default(6) }),
 *     component: TourGrid,
 *   });
 */
export interface BlockDefinition<TProps = Record<string, unknown>> {
  name: string;
  label: string;
  description?: string;
  schema: z.ZodType<TProps>;
  /**
   * The React component. Typed loosely on purpose: the registry stores blocks
   * of many different prop shapes, and each block validates its own props
   * through `schema` before rendering.
   */
  component: (props: TProps) => React.ReactNode;
}

const registry = new Map<string, BlockDefinition<never>>();

export function registerBlock<TProps>(definition: BlockDefinition<TProps>): void {
  registry.set(definition.name, definition as unknown as BlockDefinition<never>);
}

export function getBlock(name: string): BlockDefinition<never> | undefined {
  return registry.get(name);
}

export function listBlocks(): BlockDefinition<never>[] {
  return [...registry.values()];
}

/** Creates a block instance with schema defaults applied. */
export function createBlockInstance(
  name: string,
  props: Record<string, unknown> = {},
): BlockInstance {
  const definition = registry.get(name);
  const parsed = definition?.schema.safeParse(props);

  return {
    id: crypto.randomUUID(),
    type: name,
    props: parsed?.success ? (parsed.data as Record<string, unknown>) : props,
  };
}

/** The rich-text block's props, used by both the editor and the renderer. */
export const richTextSchema = z.object({
  content: z.string().default(""),
});

export type RichTextProps = z.infer<typeof richTextSchema>;

export const RICH_TEXT_BLOCK = "rich-text";
