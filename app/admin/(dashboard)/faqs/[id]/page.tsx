import { notFound } from "next/navigation";

import { FaqForm } from "@/components/cms/faq-form";
import { PageHeader } from "@/components/cms/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { faqs } from "@/lib/cms/repositories/faqs";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Edit FAQ" };

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("faqs.update");
  const { id } = await params;

  const [faq, categories] = await Promise.all([
    faqs.get(id),
    faqs.categories(),
  ]);

  if (!faq) notFound();

  return (
    <>
      <PageHeader
        title={faq.question}
        description={`Last updated ${formatDateTime(faq.updatedAt)}`}
        breadcrumbs={[
          { label: "FAQs", href: "/admin/faqs" },
          { label: faq.question },
        ]}
        actions={<StatusBadge status={faq.status} />}
      />

      <FaqForm
        faq={faq}
        categoryOptions={categories}
        canPublish={hasPermission({ role: session.role }, "faqs.publish")}
      />
    </>
  );
}
