import { Plus, Quote, Star } from "lucide-react";
import Link from "next/link";

import { TestimonialRowActions } from "@/app/admin/(dashboard)/testimonials/row-actions";
import { TestimonialFilters } from "@/app/admin/(dashboard)/testimonials/testimonial-filters";
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
import { testimonials } from "@/lib/cms/repositories/testimonials";
import { tours } from "@/lib/cms/repositories/tours";
import { listOptionsSchema } from "@/schemas/common";
import { testimonialFiltersSchema } from "@/schemas/testimonial";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("testimonials.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    status: params.status,
    sort: params.sort,
    order: params.order,
  });

  const filters = testimonialFiltersSchema.parse({
    rating: params.rating,
    featured: params.featured,
  });

  const [result, tourOptions, summary] = await Promise.all([
    testimonials.list({
      ...options,
      rating: filters.rating ? Number(filters.rating) : undefined,
      featured: filters.featured === "" ? undefined : filters.featured === "yes",
    }),
    tours.list({ perPage: 100 }),
    testimonials.ratingSummary(),
  ]);

  const tourNames = new Map(
    tourOptions.items.map((tour) => [tour.id, tour.name]),
  );

  const canCreate = hasPermission({ role: session.role }, "testimonials.create");
  const canUpdate = hasPermission({ role: session.role }, "testimonials.update");
  const canDelete = hasPermission({ role: session.role }, "testimonials.delete");
  const canPublish = hasPermission(
    { role: session.role },
    "testimonials.publish",
  );

  const filtered =
    Boolean(options.search) ||
    options.status !== "any" ||
    Boolean(filters.rating) ||
    filters.featured !== "";

  return (
    <>
      <PageHeader
        title="Testimonials"
        description={
          summary.average === null
            ? "What your travellers said, in their own words."
            : `${summary.average} out of 5 across ${summary.count} published review${
                summary.count === 1 ? "" : "s"
              }.`
        }
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/admin/testimonials/new">
                <Plus className="size-4" />
                New testimonial
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <TestimonialFilters />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<Quote className="size-8" />}
            title={
              filtered
                ? "No testimonials match those filters"
                : "No testimonials yet"
            }
            description={
              filtered
                ? "Try a different search term, or clear the status, rating and featured filters."
                : "Add what your travellers said. Quote them; do not rewrite them."
            }
            action={
              canCreate && !filtered ? (
                <Button asChild size="sm">
                  <Link href="/admin/testimonials/new">
                    Add your first testimonial
                  </Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Who</TH>
                <TH className="hidden lg:table-cell">Quote</TH>
                <TH className="hidden sm:table-cell">Rating</TH>
                <TH className="hidden xl:table-cell">About</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <div className="flex items-center gap-3">
                      <div className="size-9 shrink-0 overflow-hidden rounded-full border border-border">
                        <MediaThumb
                          url={item.image ?? ""}
                          kind={item.image ? "image" : "other"}
                          alt=""
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {canUpdate ? (
                            <Link
                              href={`/admin/testimonials/${item.id}`}
                              className="font-medium hover:text-primary"
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{item.name}</span>
                          )}
                          {item.featured ? (
                            <Star
                              className="size-3.5 fill-current text-amber-500"
                              aria-label="Featured"
                            />
                          ) : null}
                        </div>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[item.position, item.company, item.country]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                    </div>
                  </TD>

                  <TD className="hidden max-w-md lg:table-cell">
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </span>
                  </TD>

                  <TD className="hidden sm:table-cell">
                    <span
                      className="flex items-center gap-0.5"
                      aria-label={`${item.rating} out of 5`}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Star
                          key={value}
                          aria-hidden="true"
                          className={
                            value <= item.rating
                              ? "size-3.5 fill-current text-amber-500"
                              : "size-3.5 text-muted-foreground/30"
                          }
                        />
                      ))}
                    </span>
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground xl:table-cell">
                    {item.tourId
                      ? (tourNames.get(item.tourId) ?? "Deleted tour")
                      : "—"}
                  </TD>

                  <TD className="hidden md:table-cell">
                    <StatusBadge status={item.status} />
                  </TD>

                  <TD className="text-right">
                    <TestimonialRowActions
                      testimonial={{
                        id: item.id,
                        name: item.name,
                        status: item.status,
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
          basePath="/admin/testimonials"
          searchParams={{
            search: options.search || undefined,
            status: options.status === "any" ? undefined : options.status,
            rating: filters.rating || undefined,
            featured: filters.featured || undefined,
          }}
        />
      </Card>
    </>
  );
}
