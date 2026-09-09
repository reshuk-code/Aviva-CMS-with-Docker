import { MapPinned, Plus, Star } from "lucide-react";
import Link from "next/link";

import { DestinationFilters } from "@/app/admin/(dashboard)/destinations/destination-filters";
import { DestinationRowActions } from "@/app/admin/(dashboard)/destinations/row-actions";
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
import { destinations } from "@/lib/cms/repositories/destinations";
import { listOptionsSchema } from "@/schemas/common";
import { destinationFiltersSchema } from "@/schemas/destination";

export const metadata = { title: "Destinations" };

export default async function DestinationsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("destinations.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    status: params.status,
    sort: params.sort,
    order: params.order,
  });

  const filters = destinationFiltersSchema.parse({
    country: params.country,
    featured: params.featured,
  });

  const [result, countries] = await Promise.all([
    destinations.list({
      ...options,
      country: filters.country || undefined,
      featured: filters.featured === "" ? undefined : filters.featured === "yes",
    }),
    destinations.countries(),
  ]);

  const canCreate = hasPermission({ role: session.role }, "destinations.create");
  const canUpdate = hasPermission({ role: session.role }, "destinations.update");
  const canDelete = hasPermission({ role: session.role }, "destinations.delete");
  const canPublish = hasPermission({ role: session.role }, "destinations.publish");

  const filtered =
    Boolean(options.search) ||
    options.status !== "any" ||
    Boolean(filters.country) ||
    filters.featured !== "";

  return (
    <>
      <PageHeader
        title="Destinations"
        description="The places your tours, activities and stories are organised around."
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/admin/destinations/new">
                <Plus className="size-4" />
                New destination
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <DestinationFilters countries={countries} />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<MapPinned className="size-8" />}
            title={
              filtered
                ? "No destinations match those filters"
                : "No destinations yet"
            }
            description={
              filtered
                ? "Try a different search term, or clear the status, country and featured filters."
                : "Add the places you run trips to. Tour packages will reference them."
            }
            action={
              canCreate && !filtered ? (
                <Button asChild size="sm">
                  <Link href="/admin/destinations/new">
                    Add your first destination
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
                <TH className="hidden sm:table-cell">Where</TH>
                <TH className="hidden lg:table-cell">Best season</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((destination) => (
                <TR key={destination.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border">
                        <MediaThumb
                          url={destination.featuredImage ?? ""}
                          kind={destination.featuredImage ? "image" : "other"}
                          alt=""
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {canUpdate ? (
                            <Link
                              href={`/admin/destinations/${destination.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {destination.name}
                            </Link>
                          ) : (
                            <span className="font-medium">
                              {destination.name}
                            </span>
                          )}
                          {destination.featured ? (
                            <Star
                              className="size-3.5 fill-current text-amber-500"
                              aria-label="Featured"
                            />
                          ) : null}
                        </div>
                        <span className="block truncate text-xs text-muted-foreground">
                          <code>{destination.slug}</code>
                          {destination.typicalDuration
                            ? ` · ${destination.typicalDuration}`
                            : ""}
                        </span>
                      </div>
                    </div>
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground sm:table-cell">
                    {[destination.region, destination.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground lg:table-cell">
                    {destination.bestSeason.length
                      ? `${destination.bestSeason.length} month${
                          destination.bestSeason.length === 1 ? "" : "s"
                        }`
                      : "Year-round"}
                  </TD>

                  <TD className="hidden md:table-cell">
                    <StatusBadge status={destination.status} />
                  </TD>

                  <TD className="text-right">
                    <DestinationRowActions
                      destination={{
                        id: destination.id,
                        name: destination.name,
                        status: destination.status,
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
          basePath="/admin/destinations"
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
