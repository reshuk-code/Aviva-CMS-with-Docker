import { MessageSquareQuote, Plus } from "lucide-react";
import Link from "next/link";

import { FaqFilters } from "@/app/admin/(dashboard)/faqs/faq-filters";
import { FaqRowActions } from "@/app/admin/(dashboard)/faqs/row-actions";
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
import { faqs } from "@/lib/cms/repositories/faqs";
import { listOptionsSchema } from "@/schemas/common";
import { faqFiltersSchema } from "@/schemas/faq";

export const metadata = { title: "FAQs" };

export default async function FaqsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("faqs.read");
  const params = await searchParams;

  const options = listOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    status: params.status,
    sort: params.sort,
    order: params.order,
  });

  const filters = faqFiltersSchema.parse({ category: params.category });

  const [result, categories] = await Promise.all([
    faqs.list({ ...options, category: filters.category || undefined }),
    faqs.categories(),
  ]);

  const canCreate = hasPermission({ role: session.role }, "faqs.create");
  const canUpdate = hasPermission({ role: session.role }, "faqs.update");
  const canDelete = hasPermission({ role: session.role }, "faqs.delete");
  const canPublish = hasPermission({ role: session.role }, "faqs.publish");

  const filtered =
    Boolean(options.search) ||
    options.status !== "any" ||
    Boolean(filters.category);

  return (
    <>
      <PageHeader
        title="FAQs"
        description="The questions customers actually ask, and your answers to them."
        actions={
          canCreate ? (
            <Button asChild size="sm">
              <Link href="/admin/faqs/new">
                <Plus className="size-4" />
                New FAQ
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <FaqFilters categories={categories} />

        {result.items.length === 0 ? (
          <EmptyState
            icon={<MessageSquareQuote className="size-8" />}
            title={filtered ? "No FAQs match those filters" : "No FAQs yet"}
            description={
              filtered
                ? "Try a different search term, or clear the status and category filters."
                : "Answer the questions your inbox keeps receiving. Group them with a category."
            }
            action={
              canCreate && !filtered ? (
                <Button asChild size="sm">
                  <Link href="/admin/faqs/new">Add your first FAQ</Link>
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Question</TH>
                <TH className="hidden lg:table-cell">Category</TH>
                <TH className="hidden sm:table-cell">Order</TH>
                <TH className="hidden md:table-cell">Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>

            <TBody>
              {result.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <div className="min-w-0 max-w-2xl">
                      {canUpdate ? (
                        <Link
                          href={`/admin/faqs/${item.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {item.question}
                        </Link>
                      ) : (
                        <span className="font-medium">{item.question}</span>
                      )}
                      <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {item.answer}
                      </span>
                    </div>
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground lg:table-cell">
                    {item.category ?? "—"}
                  </TD>

                  <TD className="hidden text-xs text-muted-foreground sm:table-cell">
                    {item.order}
                  </TD>

                  <TD className="hidden md:table-cell">
                    <StatusBadge status={item.status} />
                  </TD>

                  <TD className="text-right">
                    <FaqRowActions
                      faq={{
                        id: item.id,
                        question: item.question,
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
          basePath="/admin/faqs"
          searchParams={{
            search: options.search || undefined,
            status: options.status === "any" ? undefined : options.status,
            category: filters.category || undefined,
          }}
        />
      </Card>
    </>
  );
}
