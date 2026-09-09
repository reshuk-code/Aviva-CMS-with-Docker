import Link from "next/link";
import {
  FileText,
  FilePlus2,
  Link2,
  Navigation,
  PencilLine,
  Settings,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/cms/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { isModuleEnabled } from "@/lib/cms/config";
import { activity } from "@/lib/cms/repositories/activity";
import { navigation } from "@/lib/cms/repositories/navigation";
import { pages } from "@/lib/cms/repositories/pages";
import { redirects } from "@/lib/cms/repositories/redirects";
import { users } from "@/lib/cms/repositories/users";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

/**
 * Dashboard.
 *
 * Every number here is a real count from the database. There are no charts:
 * a small travel agency does not need a sparkline of page edits, it needs to
 * know what is unpublished and what to do next (§22, §28).
 *
 * Widgets follow the enabled modules, so a client without Redirects never sees
 * a Redirects tile.
 */
export default async function DashboardPage() {
  const [published, drafts, scheduled, menus, redirectList, userCount, recent] =
    await Promise.all([
      pages.count({ status: "published" }),
      pages.count({ status: "draft" }),
      pages.count({ status: "scheduled" }),
      isModuleEnabled("navigation") ? navigation.listMenus() : [],
      isModuleEnabled("redirects") ? redirects.list({ perPage: 1 }) : null,
      isModuleEnabled("users") ? users.count() : 0,
      activity.recent(8),
    ]);

  const stats = [
    {
      label: "Published pages",
      value: published,
      href: "/admin/pages?status=published",
      icon: FileText,
      show: isModuleEnabled("pages"),
    },
    {
      label: "Drafts",
      value: drafts,
      href: "/admin/pages?status=draft",
      icon: PencilLine,
      show: isModuleEnabled("pages"),
    },
    {
      label: "Scheduled",
      value: scheduled,
      href: "/admin/pages?status=scheduled",
      icon: FileText,
      show: isModuleEnabled("pages") && scheduled > 0,
    },
    {
      label: "Menus",
      value: menus.length,
      href: "/admin/navigation",
      icon: Navigation,
      show: isModuleEnabled("navigation"),
    },
    {
      label: "Redirects",
      value: redirectList?.total ?? 0,
      href: "/admin/redirects",
      icon: Link2,
      show: isModuleEnabled("redirects"),
    },
    {
      label: "Team members",
      value: userCount,
      href: "/admin/users",
      icon: Users,
      show: isModuleEnabled("users"),
    },
  ].filter((stat) => stat.show);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of your website's content."
        actions={
          <Button asChild size="sm">
            <Link href="/admin/pages/new">
              <FilePlus2 className="size-4" />
              New page
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            description="The last few changes made in the admin."
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Nothing has happened yet"
              description="Create your first page and it will show up here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-4 px-5 py-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{entry.userName}</span>{" "}
                    <span className="text-muted-foreground">
                      {entry.action.replace("_", " ")}
                    </span>{" "}
                    <span className="truncate">{entry.entityTitle}</span>
                  </span>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={entry.createdAt}
                  >
                    {formatRelative(entry.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick actions" />
          <CardBody className="flex flex-col gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/admin/pages/new">
                <FilePlus2 className="size-4" />
                Create a page
              </Link>
            </Button>
            {isModuleEnabled("navigation") ? (
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/admin/navigation">
                  <Navigation className="size-4" />
                  Edit menus
                </Link>
              </Button>
            ) : null}
            {isModuleEnabled("settings") ? (
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/admin/settings">
                  <Settings className="size-4" />
                  Site settings
                </Link>
              </Button>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
