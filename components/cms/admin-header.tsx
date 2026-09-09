"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ExternalLink, LogOut, Moon, Sun, UserRound } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { Role } from "@/types/user";

export function AdminHeader({
  user,
  themeToggle,
  signOutAction,
}: {
  user: { name: string; email: string; role: Role };
  themeToggle: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-2 border-b border-border bg-background/95 px-4 backdrop-blur lg:px-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/" target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" />
          <span className="hidden sm:inline">View site</span>
        </Link>
      </Button>

      {themeToggle ? <ThemeToggle /> : null}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          >
            <span className="grid size-7 place-items-center rounded-full bg-accent text-accent-foreground">
              <UserRound className="size-4" />
            </span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-xs font-medium">{user.name}</span>
              <span className="block text-[0.7rem] text-muted-foreground">
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

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Which icon shows is decided by CSS (the provider puts `class="dark"` on
  // <html>), not by React state. That keeps the server and client markup
  // identical, so there is no hydration mismatch and no mounting flag.
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle light or dark theme"
    >
      <Sun className="size-4 hidden dark:block" />
      <Moon className="size-4 dark:hidden" />
    </Button>
  );
}
