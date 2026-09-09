"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

import { ADMIN_NAV } from "@/config/admin-nav";
import { cn } from "@/lib/utils";
import type { CmsModuleKey } from "@/lib/cms/define-config";
import type { Permission } from "@/types/user";

interface SidebarProps {
  /** Modules enabled for this project, from cms.config.ts. */
  enabledModules: CmsModuleKey[];
  /** Permissions the signed-in user holds, resolved on the server. */
  grantedPermissions: Permission[];
  brandName: string;
}

/**
 * Admin sidebar.
 *
 * Filtering happens against props computed on the server; this component never
 * decides what the user may do, it only decides what to draw.
 */
export function Sidebar({
  enabledModules,
  grantedPermissions,
  brandName,
}: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
        className="fixed left-3 top-3 z-50 rounded-md border border-border bg-card p-2 shadow-sm lg:hidden"
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
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground",
          "transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center border-b border-border px-5">
          <Link
            href="/admin"
            className="truncate text-sm font-semibold tracking-tight"
            onClick={() => setOpen(false)}
          >
            {brandName}
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {groups.map((group, index) => (
            <div key={group.label ?? `group-${index}`} className="space-y-1">
              {group.label ? (
                <p className="px-2 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
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
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground/60"
                      title="Not built yet — see docs/ROADMAP.md"
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto rounded border border-border px-1 text-[0.6rem] uppercase tracking-wide">
                        Soon
                      </span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-accent font-medium text-accent-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
