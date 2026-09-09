import { Compass, Plus, Star } from "lucide-react";
import Link from "next/link";

import { TourFilters } from "@/app/admin/(dashboard)/tours/tour-filters";
import { TourRowActions } from "@/app/admin/(dashboard)/tours/row-actions";
import { MediaThumb } from "@/components/cms/media-thumb";
import { PageHeader } from "@/components/cms/page-header";
import { Badge, StatusBadge } from "@/components/ui/badge";
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
import { tours } from "@/lib/cms/repositories/tours";
import { listOptionsSchema } from "@/schemas/common";
import { tourFiltersSchema } from "@/schemas/tour";

export const metadata = { title: "Tour packages" };

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
  strenuous: "Strenuous",
  extreme: "Extreme",
};

/** "$1,450" — the display price, formatted for the admin table only. */
function formatPrice(amount: number | null, currency: string): string {
  if (amount === null) return "—";

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      // "$1,450" rather than "US$1,450": the admin shows one company's own
      // prices, so the country prefix is noise.
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // An unknown currency code should not break the whole list.
    return `${amount} ${currency}`;
  }
}

export default async function ToursListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("tours.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    status: params.status,
    sort: params.sort,
    order: params.order,
  });

  const filters = tourFiltersSchema.parse({
    destination: params.destination,
    difficulty: params.difficulty,
    featured: params.featured,
  });

  const [result, destinationOptions] = await Promise.all([
    tours.list({
      ...options,
      destinationId: filters.destination || undefined,
      difficulty: filters.difficulty || undefined,
      featured: filters.featured === "" ? undefined : filters.featured === "yes",
    }),
    destinations.options(),
  ]);

  const destinationNames = new Map(
    destinationOptions.map((option) => [option.id, option.name]),
  );

  const canCreate = hasPermission({ role: session.role }, "tours.create");
  const canUpdate = hasPermission({ role: session.role }, "tours.update");
  const canDelete = hasPermission({ role: session.role }, "tours.delete");
  const canPublish = hasPermission({ role: session.role }, "tours.publish");

  const filtered =
    Boolean(options.search) ||
    options.status !== "any" ||
    Boolean(filters.destination) ||
    Boolean(filters.difficulty) ||
    filters.featured !== "";

  return (
    <>
      <PageHeader
        title="Tour packages"
        description="What the company sells: price, length, difficulty and a day-by-day itinerary."
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/admin/tours/new">
                <Plus className="size-4" />
                New tour
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <TourFilters destinations={destinationOptions} />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<Compass className="size-8" />}
            title={filtered ? "No tours match those filters" : "No tours yet"}
            description={
              filtered
                ? "Try a different search term, or clear the status, destination, difficulty and featured filters."
                : "Add the trips this company runs. Each one can carry a full day-by-day itinerary."
            }
            action={
              canCreate && !filtered ? (
                <Button asChild size="sm">
                  <Link href="/admin/tours/new">Add your first tour</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Tour</TH>
                <TH className="hidden sm:table-cell">Destination</TH>
                <TH className="hidden lg:table-cell">Length</TH>
                <TH className="hidden lg:table-cell">Price</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((tour) => (
                <TR key={tour.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border">
                        <MediaThumb
                          url={tour.featuredImage ?? ""}
                          kind={tour.featuredImage ? "image" : "other"}
                          alt=""
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {canUpdate ? (
                            <Link
                              href={`/admin/tours/${tour.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {tour.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{tour.name}</span>
                          )}
                          {tour.featured ? (
                            <Star
                              className="size-3.5 fill-current text-amber-500"
                              aria-label="Featured"
                            />
                          ) : null}
                        </div>
                        <span className="block truncate text-xs text-muted-foreground">
                          <code>{tour.slug}</code>
                          {tour.itinerary.length
                            ? ` · ${tour.itinerary.length}-day itinerary`
                            : " · no itinerary"}
                        </span>
                      </div>
                    </div>
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground sm:table-cell">
                    {tour.destinationId
                      ? (destinationNames.get(tour.destinationId) ?? "Deleted destination")
                      : "—"}
                  </TD>

                  <TD className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {tour.durationDays
                      ? `${tour.durationDays} day${tour.durationDays === 1 ? "" : "s"}`
                      : "—"}
                    {tour.difficulty ? (
                      <Badge tone="neutral" className="ml-2">
                        {DIFFICULTY_LABELS[tour.difficulty]}
                      </Badge>
                    ) : null}
                  </TD>

                  <TD className="hidden whitespace-nowrap text-xs lg:table-cell">
                    {formatPrice(tour.price, tour.currency)}
                  </TD>

                  <TD className="hidden md:table-cell">
                    <StatusBadge status={tour.status} />
                  </TD>

                  <TD className="text-right">
                    <TourRowActions
                      tour={{
                        id: tour.id,
                        name: tour.name,
                        status: tour.status,
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
          basePath="/admin/tours"
          searchParams={{
            search: options.search || undefined,
            status: options.status === "any" ? undefined : options.status,
            destination: filters.destination || undefined,
            difficulty: filters.difficulty || undefined,
            featured: filters.featured || undefined,
          }}
        />
      </Card>
    </>
  );
}
