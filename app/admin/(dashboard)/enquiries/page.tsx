import { Inbox } from "lucide-react";
import Link from "next/link";

import { EnquiryFilters } from "@/app/admin/(dashboard)/enquiries/enquiry-filters";
import { EnquiryRowActions } from "@/app/admin/(dashboard)/enquiries/row-actions";
import { PageHeader } from "@/components/cms/page-header";
import { EnquiryStatusBadge } from "@/components/ui/badge";
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
import { enquiries } from "@/lib/cms/repositories/enquiries";
import { formatDateTime } from "@/lib/utils";
import { listOptionsSchema } from "@/schemas/common";
import { enquiryFiltersSchema } from "@/schemas/enquiry";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("enquiries.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    sort: params.sort,
    order: params.order,
  });

  // `state`, not `status`: see the note in EnquiryFilters.
  const filters = enquiryFiltersSchema.parse({ status: params.state });

  const [result, counts] = await Promise.all([
    enquiries.list({
      ...options,
      enquiryStatus: filters.status === "any" ? undefined : filters.status,
    }),
    enquiries.statusCounts(),
  ]);

  const canUpdate = hasPermission({ role: session.role }, "enquiries.update");
  const canDelete = hasPermission({ role: session.role }, "enquiries.delete");

  const filtered = Boolean(options.search) || filters.status !== "any";

  return (
    <>
      <PageHeader
        title="Enquiries"
        description={
          counts.new > 0
            ? `${counts.new} new enquir${counts.new === 1 ? "y" : "ies"} waiting.`
            : "Everything that came in through the contact and booking forms."
        }
      />

      <Card>
        <EnquiryFilters counts={counts} />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-8" />}
            title={filtered ? "No enquiries match those filters" : "No enquiries yet"}
            description={
              filtered
                ? "Try a different search term, or switch the triage filter back to all enquiries."
                : "Enquiries arrive here when your site posts a contact or booking form to cms.enquiries.create(). Nothing to do until one does."
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>From</TH>
                <TH className="hidden lg:table-cell">Message</TH>
                <TH className="hidden xl:table-cell">Travelling</TH>
                <TH className="hidden sm:table-cell">Received</TH>
                <TH className="hidden md:table-cell">State</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/enquiries/${item.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {item.name}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.email}
                        {item.country ? ` · ${item.country}` : ""}
                      </span>
                    </div>
                  </TD>

                  <TD className="hidden max-w-md lg:table-cell">
                    <span className="line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </span>
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground xl:table-cell">
                    {[
                      item.travelDate,
                      item.travellers
                        ? `${item.travellers} traveller${item.travellers === 1 ? "" : "s"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </TD>

                  <TD className="hidden whitespace-nowrap text-xs text-muted-foreground sm:table-cell">
                    {formatDateTime(item.createdAt)}
                  </TD>

                  <TD className="hidden md:table-cell">
                    <EnquiryStatusBadge status={item.status} />
                  </TD>

                  <TD className="text-right">
                    <EnquiryRowActions
                      enquiry={{
                        id: item.id,
                        name: item.name,
                        status: item.status,
                      }}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        <Pagination
          result={result}
          basePath="/admin/enquiries"
          searchParams={{
            search: options.search || undefined,
            state: filters.status === "any" ? undefined : filters.status,
          }}
        />
      </Card>
    </>
  );
}
