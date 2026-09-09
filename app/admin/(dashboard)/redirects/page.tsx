import { Link2 } from "lucide-react";

import { RedirectForm } from "@/app/admin/(dashboard)/redirects/redirect-form";
import { DeleteRedirectButton } from "@/app/admin/(dashboard)/redirects/delete-button";
import { PageHeader } from "@/components/cms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
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
import { redirects } from "@/lib/cms/repositories/redirects";
import { listOptionsSchema } from "@/schemas/common";

export const metadata = { title: "Redirects" };

/**
 * Redirects.
 *
 * Applied by the CMS catch-all route when a path matches neither a
 * hand-written route nor a CMS page — so a redirect never shadows real
 * content, it only rescues what would otherwise 404.
 */
export default async function RedirectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("redirects.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
  });

  const result = await redirects.list(options);

  const canCreate = hasPermission({ role: session.role }, "redirects.create");
  const canDelete = hasPermission({ role: session.role }, "redirects.delete");

  return (
    <>
      <PageHeader
        title="Redirects"
        description="Send an old address to a new one. Useful when a page is renamed or a site is migrated."
      />

      <div className="space-y-5">
        {canCreate ? <RedirectForm /> : null}

        <Card>
          <CardHeader
            title="All redirects"
            description={`${result.total} rule${result.total === 1 ? "" : "s"}`}
          />

          {result.items.length === 0 ? (
            <EmptyState
              icon={<Link2 className="size-8" />}
              title="No redirects yet"
              description="Add one above when you rename a page or retire an old URL."
            />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>From</TH>
                  <TH>To</TH>
                  <TH className="hidden sm:table-cell">Type</TH>
                  <TH className="text-right">Actions</TH>
                </tr>
              </THead>

              <TBody>
                {result.items.map((rule) => (
                  <TR key={rule.id}>
                    <TD>
                      <code className="text-xs">{rule.source}</code>
                      {!rule.enabled ? (
                        <Badge tone="neutral" className="ml-2">
                          Disabled
                        </Badge>
                      ) : null}
                    </TD>
                    <TD>
                      <code className="text-xs">{rule.destination}</code>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <Badge tone={rule.permanent ? "info" : "neutral"}>
                        {rule.permanent ? "308 permanent" : "307 temporary"}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      {canDelete ? (
                        <DeleteRedirectButton id={rule.id} source={rule.source} />
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}

          <Pagination
            result={result}
            basePath="/admin/redirects"
            searchParams={{ search: options.search || undefined }}
          />
        </Card>
      </div>
    </>
  );
}
