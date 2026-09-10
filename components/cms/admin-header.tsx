"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ExternalLink, Inbox, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { ADMIN_NAV } from "@/config/admin-nav";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Role } from "@/types/user";

export function AdminHeader({
  user,
  themeToggle,
  signOutAction,
  newEnquiries,
}: {
  user: { name: string; email: string; role: Role };
  themeToggle: boolean;
  signOutAction: () => Promise<void>;
  /**
   * Unreplied enquiries. Null when the module is off or the user cannot read
   * them — the badge is a real count or it is absent; there is no placeholder.
   *
   * Deliberately NOT accompanied by a search field or a notification bell: the
   * CMS has neither, and admin chrome that does nothing is the dead-link
   * problem in a different costume (§28).
   */
  newEnquiries: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-20 mb-4 flex h-16 items-center gap-1.5 rounded-card bg-card px-4 shadow-[var(--shadow-card)] lg:px-5 dark:border dark:border-border">
      <p className="ml-9 truncate text-[0.95rem] font-semibold tracking-tight lg:ml-0">
        {sectionTitle(pathname)}
      </p>

      <div className="flex-1" />

      {/*
        The count rides INSIDE the button as a trailing pill, not pinned to its
        outer corner. A negatively-offset badge escaped the button's box, kissed
        the header's edge and dragged the eye above the row everything else sits
        on. It also matches how the sidebar shows the same number.
      */}
      {newEnquiries !== null ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/enquiries" className="h-9">
            <Inbox className="size-4" />
            <span className="hidden sm:inline">Enquiries</span>
            {newEnquiries > 0 ? (
              <span className="grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-accent px-1.5 text-[0.68rem] font-bold text-accent-foreground">
                {newEnquiries}
              </span>
            ) : null}
          </Link>
        </Button>
      ) : null}

      <Button variant="ghost" size="sm" asChild>
        <Link href="/" target="_blank" rel="noreferrer" className="h-9">
          <ExternalLink className="size-4" />
          <span className="hidden sm:inline">View site</span>
        </Link>
      </Button>

      {themeToggle ? <ThemeToggle /> : null}

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex h-11 items-center gap-2.5 rounded-[0.7rem] px-2 text-sm transition-colors hover:bg-muted"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
              <UserRound className="size-4" />
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[0.82rem] font-semibold">{user.name}</span>
              <span className="block text-[0.7rem] leading-tight text-muted-foreground">
                {ROLE_LABELS[user.role]}
              </span>
            </span>
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={6}
            className="z-50 min-w-52 rounded-md border border-border bg-card p-1 shadow-lg"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>

            <DropdownMenu.Separator className="my-1 h-px bg-border" />

            <DropdownMenu.Item asChild>
              <Link
                href="/admin/account"
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
              >
                <UserRound className="size-4" />
                Your account
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item
              onSelect={(event) => {
                event.preventDefault();
                startTransition(() => signOutAction());
              }}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none data-[highlighted]:bg-muted"
            >
              <LogOut className="size-4" />
              {pending ? "Signing out…" : "Sign out"}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}

/**
 * The name of the section being viewed, read off the same nav definition the
 * sidebar draws from — so the two can never disagree, and a route nobody has
 * declared shows nothing rather than a guessed title.
 */
function sectionTitle(pathname: string): string {
  if (pathname === "/admin") return "Dashboard";

  const match = ADMIN_NAV.flatMap((group) => group.items)
    .filter((item) => item.href !== "/admin")
    .filter(
      (item) =>
        pathname === item.href || pathname.startsWith(`${item.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];

  return match?.label ?? "";
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Which icon shows is decided by CSS (the provider puts `class="dark"` on
  // <html>), not by React state. That keeps the server and client markup
  // identical, so there is no hydration mismatch and no mounting flag.
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle light or dark theme"
    >
      <Sun className="size-4 hidden dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
