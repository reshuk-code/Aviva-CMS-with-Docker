import { notFound } from "next/navigation";

import { PageHeader } from "@/components/cms/page-header";
import { TestimonialForm } from "@/components/cms/testimonial-form";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { testimonials } from "@/lib/cms/repositories/testimonials";
import { tours } from "@/lib/cms/repositories/tours";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Edit testimonial" };

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("testimonials.update");
  const { id } = await params;

  const [testimonial, tourList, countries] = await Promise.all([
    testimonials.get(id),
    tours.list({ perPage: 100, sort: "name", order: "asc" }),
    testimonials.countries(),
  ]);

  if (!testimonial) notFound();

  return (
    <>
      <PageHeader
        title={testimonial.name}
        description={`Last updated ${formatDateTime(testimonial.updatedAt)}`}
        breadcrumbs={[
          { label: "Testimonials", href: "/admin/testimonials" },
          { label: testimonial.name },
        ]}
        actions={<StatusBadge status={testimonial.status} />}
      />

      <TestimonialForm
        testimonial={testimonial}
        tourOptions={tourList.items.map(({ id: tourId, name }) => ({
          id: tourId,
          name,
        }))}
        countryOptions={countries}
        canPublish={hasPermission({ role: session.role }, "testimonials.publish")}
      />
    </>
  );
}
