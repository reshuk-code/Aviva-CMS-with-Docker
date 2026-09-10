import { Footprints, Plus } from "lucide-react";
import Link from "next/link";

import { ActivityRowActions } from "@/app/admin/(dashboard)/activities/row-actions";
import { ListToolbar } from "@/components/cms/list-toolbar";
import { MediaThumb } from "@/components/cms/media-thumb";
import { PageHeader } from "@/components/cms/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  EmptyState,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
} from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { activities } from "@/lib/cms/repositories/activities";
import { tours } from "@/lib/cms/repositories/tours";
import { listOptionsSchema } from "@/schemas/common";

export const metadata = { title: "Activities" };

export default async function ActivitiesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("activities.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    status: params.status,
    sort: params.sort,
    order: params.order,
  });

  const [result, usage] = await Promise.all([
    activities.list(options),
    tours.activityUsage(),
  ]);

  const canCreate = hasPermission({ role: session.role }, "activities.create");
  const canUpdate = hasPermission({ role: session.role }, "activities.update");
  const canDelete = hasPermission({ role: session.role }, "activities.delete");
  const canPublish = hasPermission({ role: session.role }, "activities.publish");

  const filtered = Boolean(options.search) || options.status !== "any";

  return (
    <>
      <PageHeader
        title="Activities"
        description="The things travellers do — the labels tour packages are tagged with."
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/admin/activities/new">
                <Plus className="size-4" />
                New activity
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <ListToolbar placeholder="Search activities by name or slug…" />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<Footprints className="size-8" />}
            title={
              filtered ? "No activities match those filters" : "No activities yet"
            }
            description={
              filtered
                ? "Try a different search term, or clear the status filter."
                : "Add what your travellers actually do — trekking, rafting, a jungle safari. Tour packages tag themselves with these."
            }
            action={
              canCreate && !filtered ? (
                <Button asChild size="sm">
                  <Link href="/admin/activities/new">
                    Add your first activity
                  </Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH className="hidden lg:table-cell">Icon</TH>
                <TH className="hidden sm:table-cell">Used by</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((item) => {
                const usedByTours = usage[item.id] ?? 0;

                return (
                  <TR key={item.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border">
                          <MediaThumb
                            url={item.featuredImage ?? ""}
                            kind={item.featuredImage ? "image" : "other"}
                            alt=""
                          />
                        </div>

                        <div className="min-w-0">
                          {canUpdate ? (
                            <Link
                              href={`/admin/activities/${item.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{item.name}</span>
                          )}
                          <span className="block truncate text-xs text-muted-foreground">
                            <code>{item.slug}</code>
                          </span>
                        </div>
                      </div>
                    </TD>

                    <TD className="hidden text-xs text-muted-foreground lg:table-cell">
                      {item.icon ? <code>{item.icon}</code> : "—"}
                    </TD>

                    <TD className="hidden text-xs text-muted-foreground sm:table-cell">
                      {usedByTours === 0
                        ? "No tours"
                        : `${usedByTours} tour${usedByTours === 1 ? "" : "s"}`}
                    </TD>

                    <TD className="hidden md:table-cell">
                      <StatusBadge status={item.status} />
                    </TD>

                    <TD className="text-right">
                      <ActivityRowActions
                        activity={{
                          id: item.id,
                          name: item.name,
                          status: item.status,
                          usedByTours,
                        }}
                        canUpdate={canUpdate}
                        canDelete={canDelete}
                        canPublish={canPublish}
                        canCreate={canCreate}
                      />
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}

        <Pagination
          result={result}
          basePath="/admin/activities"
          searchParams={{
            search: options.search || undefined,
            status: options.status === "any" ? undefined : options.status,
          }}
        />
      </Card>
    </>
  );
}
