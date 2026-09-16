"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { ResolvedMenuItem } from "@/types/navigation";

/**
 * The public site's main navigation, at every width.
 *
 * Above `md` it is a row of links, exactly as it was. Below that the row
 * becomes a disclosure behind a button, because a wrapping `flex-wrap` nav is
 * not a responsive nav: six links and a site name on a 390px screen wrapped
 * into three rows and squeezed the brand into a two-line column.
 *
 * A Client Component only because a disclosure needs state. The layout stays a
 * Server Component and passes the already-resolved menu in, so nothing about
 * how the menu is fetched changes.
 *
 * Nesting renders at whatever depth the editor built, in both: the menu schema
 * is recursive and the editor's indent control has no cap, so anything this
 * refused to draw would be structure a client had saved and could not see.
 *
 * Below `md` that is an indented tree in the panel. Above it, the first level
 * of children is a dropdown and deeper levels are indented groups *inside* that
 * dropdown rather than flyouts opening sideways. A flyout has to solve which
 * side of the parent it opens on, which needs a measurement after paint, and
 * gets it wrong against the right edge of the window. An indented group cannot
 * collide with anything and shows the whole branch at once.
 */
export function SiteNav({ items }: { items: ResolvedMenuItem[] }) {
  const [open, setOpen] = useState(false);
  /*
   * Which desktop dropdown is showing, by item id rather than a boolean per
   * item: one piece of state is what makes opening a second menu close the
   * first, without every item having to know about its siblings.
   *
   * `pinned` records that a press opened it, not a hover. Without that
   * distinction the two fight: moving the mouse to the chevron opens the menu,
   * so the click that follows would toggle it straight back shut and the
   * button would look dead. Pinned menus ignore the pointer leaving and close
   * only on a second press, Escape, a press elsewhere, or navigation.
   */
  const [openMenu, setOpenMenu] = useState<{
    id: string;
    pinned: boolean;
  } | null>(null);
  const panelId = useId();
  const pathname = usePathname();

  /*
   * Close on navigation.
   *
   * App Router keeps this component mounted across a route change, so without
   * this the panel stays open over the page the reader just asked for. Keyed
   * on the pathname rather than on the click, which also covers the back
   * button and any link rendered inside the panel later.
   *
   * Adjusted during render rather than in an effect, the way `FormSections`
   * does it: the lint rule against setState-in-an-effect is on for a reason,
   * and React re-runs this component before painting, so the panel never shows
   * open on the new page for a frame.
   */
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
    setOpenMenu(null);
  }

  /*
   * Escape closes whatever is showing. The dropdown handles Escape itself as
   * well, so that a keyboard user gets focus put back on the toggle; this is
   * the fallback for a menu opened by hover, where focus is somewhere else
   * entirely and there is nothing to restore.
   */
  useEffect(() => {
    if (!open && openMenu === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setOpenMenu(null);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, openMenu]);

  /*
   * A click anywhere else closes an open dropdown. Only mounted while one is
   * open, and listening on pointerdown rather than click so the menu is gone
   * before the click lands on whatever is underneath.
   */
  useEffect(() => {
    if (openMenu === null) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      // Presses inside the menu close it through its own toggle, a blur, or
      // navigation; this only has to catch a press on the rest of the page.
      if (target instanceof Element && target.closest("[data-nav-dropdown]")) {
        return;
      }
      setOpenMenu(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openMenu]);

  if (items.length === 0) return null;

  return (
    <>
      {/* ------------------------------------------------------- desktop */}
      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex items-center gap-x-5 text-sm">
          {items.map((item) => (
            <li key={item.id}>
              <DesktopItem
                item={item}
                isOpen={openMenu?.id === item.id}
                // Hovering a sibling moves the menu across, but hovering the
                // one already pinned must not quietly unpin it.
                onHoverOpen={() =>
                  setOpenMenu((current) =>
                    current?.id === item.id
                      ? current
                      : { id: item.id, pinned: false },
                  )
                }
                onHoverClose={() =>
                  setOpenMenu((current) =>
                    current?.id === item.id && !current.pinned ? null : current,
                  )
                }
                onPress={() =>
                  setOpenMenu((current) =>
                    current?.id === item.id && current.pinned
                      ? null
                      : { id: item.id, pinned: true },
                  )
                }
                onDismiss={() =>
                  setOpenMenu((current) =>
                    current?.id === item.id ? null : current,
                  )
                }
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* -------------------------------------------------------- mobile */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className="-mr-2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>

      {/*
        Rendered whether open or not, and hidden with an attribute: a panel
        that unmounts cannot be animated later, and `hidden` keeps it out of
        the accessibility tree exactly as unmounting would.
      */}
      <nav
        id={panelId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-background px-6 pb-4 shadow-sm md:hidden"
      >
        <MobileBranch items={items} />
      </nav>
    </>
  );
}

/**
 * The contents of a desktop dropdown, at any depth.
 *
 * A branch that is itself a link renders as one and carries its children
 * underneath; a branch the CMS resolved to `href: null` — a heading, or a page
 * that was unpublished — becomes a group label instead, because a link to
 * nowhere is worse than text.
 */
function SubmenuBranch({
  items,
  depth = 0,
}: {
  items: ResolvedMenuItem[];
  depth?: number;
}) {
  return (
    <ul
      className={cn(
        depth > 0 && "ml-3 border-l border-border pl-1.5",
      )}
    >
      {items.map((child) => (
        <li key={child.id}>
          {child.href ? (
            <NavLink
              item={child}
              className="block rounded-lg px-3 py-2 hover:bg-muted"
            />
          ) : (
            <span className="block px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {child.label}
            </span>
          )}

          {child.children.length > 0 ? (
            <SubmenuBranch items={child.children} depth={depth + 1} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** The mobile panel's tree, at any depth. */
function MobileBranch({
  items,
  depth = 0,
}: {
  items: ResolvedMenuItem[];
  depth?: number;
}) {
  return (
    <ul
      className={cn(
        depth === 0
          ? "space-y-1 text-sm"
          : "mb-1 ml-3 border-l border-border pl-3",
      )}
    >
      {items.map((item) => (
        <li key={item.id}>
          <MobileItem item={item} depth={depth} />
        </li>
      ))}
    </ul>
  );
}

/**
 * One row of the mobile panel, collapsed when it has children.
 *
 * Every branch starts closed. Rendering the tree expanded shows the deepest
 * item and the top-level ones at the same weight, and a menu of any size then
 * opens as a wall the reader has to scroll past to reach "Contact" — the panel
 * is a phone-height column, not a sitemap.
 *
 * The row splits into a link and a separate chevron for the same reason the
 * desktop dropdown does: tapping "Destinations" should go to /destinations,
 * not merely reveal what is under it.
 */
function MobileItem({
  item,
  depth,
}: {
  item: ResolvedMenuItem;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const submenuId = useId();

  const linkClassName = cn("block", depth === 0 ? "py-2" : "py-1.5");

  if (item.children.length === 0) {
    return <NavLink item={item} className={linkClassName} />;
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <NavLink item={item} className={cn(linkClassName, "flex-1")} />

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={submenuId}
          className="-mr-2 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={cn("size-4 transition-transform", open && "rotate-180")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="sr-only">
            {open
              ? `Hide ${item.label} submenu`
              : `Show ${item.label} submenu`}
          </span>
        </button>
      </div>

      {/* Hidden rather than unmounted, so a branch keeps its own open children
          while the reader collapses and reopens the one above it. */}
      <div id={submenuId} hidden={!open}>
        <MobileBranch items={item.children} depth={depth + 1} />
      </div>
    </>
  );
}

/**
 * One item in the desktop row, with a dropdown when it has children.
 *
 * Hover alone would be unusable by keyboard and unreachable by touch, so the
 * chevron is a real `aria-expanded` button and hovering is only a shortcut on
 * top of it. Where the parent has a URL of its own the two are separate
 * controls — clicking "Destinations" goes to /destinations, clicking the
 * chevron opens the list — because a parent that swallows its own link is the
 * usual way a dropdown loses a page.
 */
function DesktopItem({
  item,
  isOpen,
  onHoverOpen,
  onHoverClose,
  onPress,
  onDismiss,
}: {
  item: ResolvedMenuItem;
  isOpen: boolean;
  onHoverOpen: () => void;
  onHoverClose: () => void;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const submenuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  if (item.children.length === 0) {
    return <NavLink item={item} />;
  }

  const toggleLabel = isOpen
    ? `Hide ${item.label} submenu`
    : `Show ${item.label} submenu`;

  return (
    <div
      data-nav-dropdown=""
      className="relative"
      /*
       * Guarded on pointer type: a tap fires pointerenter too, which would
       * open the menu and then let the click land on the link behind it.
       * Touch users get the chevron, which is what it is there for.
       */
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onHoverOpen();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") onHoverClose();
      }}
      /*
       * Closing on focus leaving the whole group, not on the toggle losing
       * focus: tabbing from the chevron into the submenu must not close the
       * thing being tabbed into.
       */
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onDismiss();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && isOpen) {
          onDismiss();
          toggleRef.current?.focus();
        }
      }}
    >
      <span className="flex items-center gap-1">
        <NavLink item={item} />

        <button
          ref={toggleRef}
          type="button"
          onClick={onPress}
          aria-expanded={isOpen}
          aria-controls={submenuId}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={cn(
              "size-4 transition-transform",
              isOpen && "rotate-180",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
          <span className="sr-only">{toggleLabel}</span>
        </button>
      </span>

      {/*
        The wrapper carries the offset as padding rather than margin, so the
        pointer never crosses a dead gap on its way down to the list — a gap
        there fires pointerleave and closes the menu the reader is reaching for.
      */}
      <div
        id={submenuId}
        hidden={!isOpen}
        className="absolute left-0 top-full z-50 pt-3"
      >
        <div className="min-w-52 rounded-xl border border-border bg-background p-1.5 text-sm shadow-lg">
          <SubmenuBranch items={item.children} />
        </div>
      </div>
    </div>
  );
}

/**
 * One item, which may not be a link at all.
 *
 * The CMS resolves a menu item to `href: null` when it points at a page that
 * has been deleted or unpublished, and when an editor adds a plain heading. A
 * link to nowhere is worse than text, so it renders as text.
 */
function NavLink({
  item,
  className,
}: {
  item: ResolvedMenuItem;
  className?: string;
}) {
  if (!item.href) {
    return (
      <span className={cn("text-muted-foreground", className)}>
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      target={item.openInNewTab ? "_blank" : undefined}
      rel={item.openInNewTab ? "noreferrer" : undefined}
      className={cn(
        "text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      {item.label}
    </Link>
  );
}
