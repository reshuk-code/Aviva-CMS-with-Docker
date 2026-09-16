"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, LogOut, Menu, X } from "lucide-react";

import { ADMIN_NAV, type AdminNavGroup } from "@/config/admin-nav";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import type { CmsModuleKey } from "@/lib/cms/define-config";
import type { Permission, Role } from "@/types/user";

interface SidebarProps {
  /** Modules enabled for this project, from cms.config.ts. */
  enabledModules: CmsModuleKey[];
  /** Permissions the signed-in user holds, resolved on the server. */
  grantedPermissions: Permission[];
  brandName: string;
  /** Brand mark from `cms.config.ts`. Null falls back to the template mark. */
  logo: string | null;
  user: { name: string; role: Role };
  signOutAction: () => Promise<void>;
  /** Unreplied enquiries, shown as a badge. Null when the module is off. */
  newEnquiries: number | null;
}

/** True when the group holds the page currently open. */
function groupContains(group: AdminNavGroup, pathname: string): boolean {
  return group.items.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}

function initialOpenGroups(pathname: string): Set<string> {
  const open = new Set<string>();
  for (const group of ADMIN_NAV) {
    if (group.label && groupContains(group, pathname)) open.add(group.label);
  }
  return open;
}

/**
 * Admin sidebar.
 *
 * Filtering happens against props computed on the server; this component never
 * decides what the user may do, it only decides what to draw.
 *
 * On desktop it is a panel inset from the window edges rather than a full-bleed
 * column, so it reads as one of the cards rather than as chrome.
 */
export function Sidebar({
  enabledModules,
  grantedPermissions,
  brandName,
  logo,
  user,
  signOutAction,
  newEnquiries,
}: SidebarProps) {
  const pathname = usePathname();
  const currentPath = pathname.replace(/\/+$/, "") || "/";
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  /**
   * Which groups are expanded.
   *
   * Closed by default, so the sidebar is a short list rather than thirty links
   * — except the group holding the current page. A menu that hides where you
   * are is worse than a long one.
   */
  const [openGroups, setOpenGroups] = useState<Set<string>>(() =>
    initialOpenGroups(currentPath),
  );

  // Adjusted during render rather than in an effect, the way the upload zone
  // does it: following a link into a collapsed group should reveal it.
  const [seenPath, setSeenPath] = useState(currentPath);
  if (seenPath !== currentPath) {
    setSeenPath(currentPath);
    setOpenGroups((current) => {
      const next = new Set(current);
      for (const group of ADMIN_NAV) {
        if (group.label && groupContains(group, currentPath)) next.add(group.label);
      }
      return next;
    });
  }

  function toggleGroup(label: string) {
    setOpenGroups((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const modules = new Set(enabledModules);
  const permissions = new Set(grantedPermissions);
  const canSee = (permission: Permission) =>
    permissions.has("*") || permissions.has(permission);

  const groups = ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => modules.has(item.module) && canSee(item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed left-3 top-3 z-50 rounded-lg bg-card p-2 shadow-[var(--shadow-card)] lg:hidden"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
      >
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground",
          "lg:inset-y-4 lg:left-4 lg:rounded-card lg:shadow-[var(--shadow-card)] dark:lg:border dark:lg:border-border",
          "transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center px-4 pb-5 pt-5">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 truncate"
            onClick={() => setOpen(false)}
          >
            {logo ? (
              /*
               * A real brand mark brings its own colours, so it is not dropped
               * into the tinted tile below — that tile exists to make the
               * monochrome template mark legible and would fight a logo.
               * Decorative: the brand name is read out beside it.
               */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logo}
                alt=""
                className="size-9 shrink-0 object-contain"
              />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_color-mix(in_oklch,var(--primary)_75%,transparent)]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-[1.15rem]"
                  aria-hidden="true"
                >
                  <path d="M3 20l7-16 7 16" />
                  <path d="M6.5 14h7" />
                  <path d="M17 9l4 11" />
                </svg>
              </span>
            )}
            {/*
              "Aviva" orange, "CMS" blue, straight from the logo. Split on the
              last word so a client who renames the brand still gets sensible
              two-tone treatment instead of a hardcoded pair of words.
            */}
            <span className="truncate text-base font-semibold tracking-tight">
              <span style={{ color: "var(--brand-orange)" }}>
                {brandName.split(" ").slice(0, -1).join(" ") || brandName}
              </span>
              {brandName.split(" ").length > 1 ? (
                <span style={{ color: "var(--brand-blue)" }}>
                  {" "}
                  {brandName.split(" ").slice(-1)}
                </span>
              ) : null}
            </span>
          </Link>
        </div>

        <nav className="cms-scroll flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          {groups.map((group, index) => {
            const key = group.label ?? `group-${index}`;
            // An unlabelled group — Dashboard — has no heading to collapse
            // under, so it is always shown.
            const expanded = !group.label || openGroups.has(group.label);
            const label = group.label;

            return (
            <div key={key} className="space-y-1">
              {label ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(label)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-3 pb-2 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {label}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      expanded ? "rotate-180" : undefined,
                    )}
                  />
                </button>
              ) : null}

              {expanded && group.subheading ? (
                <p className="px-3 pt-1 pb-1 text-xs font-semibold text-sidebar-foreground">
                  {group.subheading}
                </p>
              ) : null}

              {expanded
                ? group.items.map((item) => {
                const active = item.matchPrefix
                  ? currentPath === item.href || currentPath.startsWith(`${item.href}/`)
                  : currentPath === item.href;

                if (item.status === "planned") {
                  return (
                    <span
                      key={item.href}
                      className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground/55"
                      title="Not built yet — see docs/ROADMAP.md"
                    >
                      <item.icon className="size-[1.1rem] shrink-0 opacity-70" />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide">
                        Soon
                      </span>
                    </span>
                  );
                }

                const badge =
                  item.href === "/admin/enquiries" && newEnquiries
                    ? newEnquiries
                    : null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group/nav flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150",
                      active
                        ? "bg-accent font-semibold text-accent-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_14%,transparent)]"
                        : "hover:bg-muted",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "size-[1.1rem] shrink-0 transition-colors",
                        active
                          ? "text-primary"
                          : "text-muted-foreground group-hover/nav:text-foreground",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                    {badge ? (
                      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[0.66rem] font-bold text-primary-foreground">
                        {badge}
                      </span>
                    ) : null}
                  </Link>
                );
                  })
                : null}
            </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border p-3 pt-3.5">
          <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
            <Link
              href="/admin/account"
              onClick={() => setOpen(false)}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-[0.72rem] font-semibold text-primary-foreground">
                {initials(user.name)}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[0.82rem] font-semibold text-foreground">
                  {user.name}
                </span>
                <span className="block truncate text-[0.7rem] text-muted-foreground">
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => startTransition(() => signOutAction())}
              disabled={pending}
              aria-label="Sign out"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/** "Reshuk Sapkota" -> "RS". Falls back to one letter for a single name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ""))
    .toUpperCase();
}
