import { z } from "zod";

import { optionalText, optionalUrl } from "./common";

/**
 * Menus are trees, and Zod needs an explicit type annotation to describe a
 * recursive schema. `MenuItemInput` below is that annotation.
 */
export interface MenuItemInput {
  id: string;
  label: string;
  target: "page" | "entity" | "custom" | "heading";
  pageId: string | null;
  entityType: string | null;
  entityId: string | null;
  url: string | null;
  openInNewTab: boolean;
  visible: boolean;
  children: MenuItemInput[];
}

export const menuItemSchema: z.ZodType<MenuItemInput> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().trim().min(1, "Every menu item needs a label."),
    target: z.enum(["page", "entity", "custom", "heading"]),
    pageId: z.string().trim().nullable().default(null),
    entityType: optionalText,
    entityId: z.string().trim().nullable().default(null),
    url: optionalUrl,
    openInNewTab: z.coerce.boolean().default(false),
    visible: z.coerce.boolean().default(true),
    children: z.array(menuItemSchema).default([]),
  }),
);

export const menuInputSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Menu key is required.")
    .regex(
      /^[a-z0-9-]+$/,
      "Use lowercase letters, numbers and hyphens (e.g. main, footer-legal).",
    ),
  name: z.string().trim().min(1, "Menu name is required."),
  items: z.array(menuItemSchema).default([]),
});

export type MenuInput = z.input<typeof menuInputSchema>;
