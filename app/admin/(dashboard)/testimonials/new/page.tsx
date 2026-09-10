import { PageHeader } from "@/components/cms/page-header";
import { TestimonialForm } from "@/components/cms/testimonial-form";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { testimonials } from "@/lib/cms/repositories/testimonials";
import { tours } from "@/lib/cms/repositories/tours";

export const metadata = { title: "New testimonial" };

export default async function NewTestimonialPage() {
  const session = await requirePermission("testimonials.create");

  const [tourList, countries] = await Promise.all([
    tours.list({ perPage: 100, sort: "name", order: "asc" }),
    testimonials.countries(),
  ]);

  return (
    <>
      <PageHeader
        title="New testimonial"
        breadcrumbs={[
          { label: "Testimonials", href: "/admin/testimonials" },
          { label: "New testimonial" },
        ]}
      />

      <TestimonialForm
        testimonial={null}
        tourOptions={tourList.items.map(({ id, name }) => ({ id, name }))}
        countryOptions={countries}
        canPublish={hasPermission({ role: session.role }, "testimonials.publish")}
      />
    </>
  );
}
