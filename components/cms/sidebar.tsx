"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { LogOut, Menu, X } from "lucide-react";

import { ADMIN_NAV } from "@/config/admin-nav";
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
  user: { name: string; role: Role };
  signOutAction: () => Promise<void>;
  /** Unreplied enquiries, shown as a badge. Null when the module is off. */
  newEnquiries: number | null;
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
  user,
  signOutAction,
  newEnquiries,
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

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
            <span className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-primary text-primary-foreground shadow-[0_6px_16px_-6px_color-mix(in_oklch,var(--primary)_75%,transparent)]">
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
            <span className="truncate text-base font-semibold tracking-tight text-foreground">
              {brandName}
            </span>
          </Link>
        </div>

        <nav className="cms-scroll flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          {groups.map((group, index) => (
            <div key={group.label ?? `group-${index}`} className="space-y-1">
              {group.label ? (
                <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </p>
              ) : null}

              {group.items.map((item) => {
                const active = item.matchPrefix
                  ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                  : pathname === item.href;

                if (item.status === "planned") {
                  return (
                    <span
                      key={item.href}
                      className="flex cursor-not-allowed items-center gap-3 rounded-[0.7rem] px-3 py-2.5 text-sm text-muted-foreground/55"
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
                      "group/nav flex items-center gap-3 rounded-[0.7rem] px-3 py-2.5 text-sm transition-colors duration-150",
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
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-border p-3 pt-3.5">
          <div className="flex items-center gap-3 rounded-[0.85rem] bg-muted px-3 py-2.5">
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
