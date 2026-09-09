import type { BaseRecord, ID } from "./common";

/**
 * What a menu item points at.
 * - `page`     -> a CMS page, resolved to its current slug at read time
 * - `entity`   -> any other CMS record (tour, destination, post...)
 * - `custom`   -> a hand-written internal or external URL
 * - `heading`  -> a non-clickable label for grouping in mega menus
 */
export type MenuItemTarget = "page" | "entity" | "custom" | "heading";

export interface MenuItem {
  id: string;
  label: string;
  target: MenuItemTarget;
  /** Set when target is "page". */
  pageId: ID | null;
  /** Set when target is "entity": which collection and which record. */
  entityType: string | null;
  entityId: ID | null;
  /** Set when target is "custom". */
  url: string | null;
  openInNewTab: boolean;
  visible: boolean;
  children: MenuItem[];
}

export interface Menu extends BaseRecord {
  /** Stable identifier used by the frontend: cms.navigation.get("main"). */
  key: string;
  name: string;
  items: MenuItem[];
}

/** A menu item after slugs/urls have been resolved, ready to render. */
export interface ResolvedMenuItem {
  id: string;
  label: string;
  href: string | null;
  openInNewTab: boolean;
  children: ResolvedMenuItem[];
}
