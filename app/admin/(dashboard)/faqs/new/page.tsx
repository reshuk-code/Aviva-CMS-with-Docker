import { FaqForm } from "@/components/cms/faq-form";
import { PageHeader } from "@/components/cms/page-header";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { faqs } from "@/lib/cms/repositories/faqs";

export const metadata = { title: "New FAQ" };

export default async function NewFaqPage() {
  const session = await requirePermission("faqs.create");
  const categories = await faqs.categories();

  return (
    <>
      <PageHeader
        title="New FAQ"
        breadcrumbs={[
          { label: "FAQs", href: "/admin/faqs" },
          { label: "New FAQ" },
        ]}
      />

      <FaqForm
        faq={null}
        categoryOptions={categories}
        canPublish={hasPermission({ role: session.role }, "faqs.publish")}
      />
    </>
  );
}
