import { Map as MapIcon, Plus, Star } from "lucide-react";
import Link from "next/link";

import { RegionFilters } from "@/app/admin/(dashboard)/regions/region-filters";
import { RegionRowActions } from "@/app/admin/(dashboard)/regions/row-actions";
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
import { regions } from "@/lib/cms/repositories/regions";
import { listOptionsSchema } from "@/schemas/common";
import { regionFiltersSchema } from "@/schemas/region";

export const metadata = { title: "Regions" };

export default async function RegionsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("regions.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    status: params.status,
    sort: params.sort,
    order: params.order,
  });

  const filters = regionFiltersSchema.parse({
    country: params.country,
    featured: params.featured,
  });

  const [result, countries] = await Promise.all([
    regions.list({
      ...options,
      country: filters.country || undefined,
      featured: filters.featured === "" ? undefined : filters.featured === "yes",
    }),
    regions.countries(),
  ]);

  const canCreate = hasPermission({ role: session.role }, "regions.create");
  const canUpdate = hasPermission({ role: session.role }, "regions.update");
  const canDelete = hasPermission({ role: session.role }, "regions.delete");
  const canPublish = hasPermission({ role: session.role }, "regions.publish");

  const filtered =
    Boolean(options.search) ||
    options.status !== "any" ||
    Boolean(filters.country) ||
    filters.featured !== "";

  return (
    <>
      <PageHeader
        title="Regions"
        description="The areas you sell trips in. Broader than a destination — Everest, Annapurna, Mustang."
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/admin/regions/new">
                <Plus className="size-4" />
                New region
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <RegionFilters countries={countries} />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<MapIcon className="size-8" />}
            title={filtered ? "No regions match those filters" : "No regions yet"}
            description={
              filtered
                ? "Try a different search term, or clear the status, country and featured filters."
                : "Add the areas you run trips in. Each one gets its own page."
            }
            action={
              canCreate && !filtered ? (
                <Button asChild size="sm">
                  <Link href="/admin/regions/new">Add your first region</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Name</TH>
                <TH className="hidden sm:table-cell">Country</TH>
                <TH className="hidden lg:table-cell">Best season</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((region) => (
                <TR key={region.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border">
                        <MediaThumb
                          url={region.featuredImage ?? ""}
                          kind={region.featuredImage ? "image" : "other"}
                          alt=""
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {canUpdate ? (
                            <Link
                              href={`/admin/regions/${region.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {region.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{region.name}</span>
                          )}
                          {region.featured ? (
                            <Star
                              className="size-3.5 fill-current text-amber-500"
                              aria-label="Featured"
                            />
                          ) : null}
                        </div>
                        <span className="block truncate text-xs text-muted-foreground">
                          <code>{region.slug}</code>
                          {region.elevationRange ? ` · ${region.elevationRange}` : ""}
                        </span>
                      </div>
                    </div>
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground sm:table-cell">
                    {region.country || "—"}
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground lg:table-cell">
                    {region.bestSeason.length
                      ? `${region.bestSeason.length} month${
                          region.bestSeason.length === 1 ? "" : "s"
                        }`
                      : "Year-round"}
                  </TD>

                  <TD className="hidden md:table-cell">
                    <StatusBadge status={region.status} />
                  </TD>

                  <TD className="text-right">
                    <RegionRowActions
                      region={{
                        id: region.id,
                        name: region.name,
                        status: region.status,
                      }}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      canPublish={canPublish}
                      canCreate={canCreate}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        <Pagination
          result={result}
          basePath="/admin/regions"
          searchParams={{
            search: options.search || undefined,
            status: options.status === "any" ? undefined : options.status,
            country: filters.country || undefined,
            featured: filters.featured || undefined,
          }}
        />
      </Card>
    </>
  );
}
