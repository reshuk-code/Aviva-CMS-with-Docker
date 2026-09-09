import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";

import { PageHeader } from "@/components/cms/page-header";
import { ListToolbar } from "@/components/cms/list-toolbar";
import { PageRowActions } from "@/app/admin/(dashboard)/pages/row-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
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
import { pages } from "@/lib/cms/repositories/pages";
import { listOptionsSchema } from "@/schemas/common";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Pages" };

export default async function PagesListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("pages.read");
  const params = await searchParams;

  // Query strings are user input: parse them rather than trusting them.
  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    status: params.status,
    sort: params.sort,
    order: params.order,
  });

  const result = await pages.list(options);

  const canCreate = hasPermission({ role: session.role }, "pages.create");
  const canUpdate = hasPermission({ role: session.role }, "pages.update");
  const canDelete = hasPermission({ role: session.role }, "pages.delete");
  const canPublish = hasPermission({ role: session.role }, "pages.publish");

  const searchState = {
    search: options.search || undefined,
    status: options.status === "any" ? undefined : options.status,
  };

  return (
    <>
      <PageHeader
        title="Pages"
        description="Content pages on your website. Each one is reachable at its slug."
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/admin/pages/new">
                <FilePlus2 className="size-4" />
                New page
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <ListToolbar placeholder="Search pages by title or slug…" />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<FileText className="size-8" />}
            title={
              options.search || options.status !== "any"
                ? "No pages match those filters"
                : "No pages yet"
            }
            description={
              options.search || options.status !== "any"
                ? "Try a different search term or clear the status filter."
                : "Pages you create here are served automatically at their slug."
            }
            action={
              canCreate && !options.search ? (
                <Button asChild size="sm">
                  <Link href="/admin/pages/new">Create your first page</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Title</TH>
                <TH className="hidden sm:table-cell">Slug</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="hidden lg:table-cell">Updated</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((page) => (
                <TR key={page.id}>
                  <TD>
                    {canUpdate ? (
                      <Link
                        href={`/admin/pages/${page.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {page.title}
                      </Link>
                    ) : (
                      <span className="font-medium">{page.title}</span>
                    )}
                    <span className="mt-0.5 block text-xs text-muted-foreground sm:hidden">
                      {page.slug}
                    </span>
                  </TD>

                  <TD className="hidden sm:table-cell">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {page.slug}
                    </code>
                  </TD>

                  <TD className="hidden md:table-cell">
                    <StatusBadge status={page.status} />
                  </TD>

                  <TD className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                    {formatRelative(page.updatedAt)}
                  </TD>

                  <TD className="text-right">
                    <PageRowActions
                      page={{
                        id: page.id,
                        title: page.title,
                        slug: page.slug,
                        status: page.status,
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
          basePath="/admin/pages"
          searchParams={searchState}
        />
      </Card>
    </>
  );
}
