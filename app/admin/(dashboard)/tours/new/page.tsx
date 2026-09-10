import { PageHeader } from "@/components/cms/page-header";
import { TourForm } from "@/components/cms/tour-form";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { activities } from "@/lib/cms/repositories/activities";
import { destinations } from "@/lib/cms/repositories/destinations";
import { settings } from "@/lib/cms/repositories/settings";

export const metadata = { title: "New tour" };

export default async function NewTourPage() {
  const session = await requirePermission("tours.create");

  const [destinationOptions, activityOptions, siteUrl] = await Promise.all([
    destinations.options(),
    activities.options(),
    settings.siteUrl(),
  ]);

  return (
    <>
      <PageHeader
        title="New tour"
        breadcrumbs={[
          { label: "Tour packages", href: "/admin/tours" },
          { label: "New tour" },
        ]}
      />

      <TourForm
        tour={null}
        destinationOptions={destinationOptions.map(({ id, name }) => ({
          id,
          name,
        }))}
        activityOptions={activityOptions.map(({ id, name }) => ({ id, name }))}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "tours.publish")}
      />
    </>
  );
}
