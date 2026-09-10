import { notFound } from "next/navigation";

import { PageHeader } from "@/components/cms/page-header";
import { TourForm } from "@/components/cms/tour-form";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { activities } from "@/lib/cms/repositories/activities";
import { destinations } from "@/lib/cms/repositories/destinations";
import { settings } from "@/lib/cms/repositories/settings";
import { tours } from "@/lib/cms/repositories/tours";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Edit tour" };

export default async function EditTourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("tours.update");
  const { id } = await params;

  const [tour, destinationOptions, activityOptions, siteUrl] = await Promise.all([
    tours.get(id),
    destinations.options(),
    activities.options(),
    settings.siteUrl(),
  ]);

  if (!tour) notFound();

  return (
    <>
      <PageHeader
        title={tour.name}
        description={`Last updated ${formatDateTime(tour.updatedAt)}`}
        breadcrumbs={[
          { label: "Tour packages", href: "/admin/tours" },
          { label: tour.name },
        ]}
        actions={<StatusBadge status={tour.status} />}
      />

      <TourForm
        tour={tour}
        destinationOptions={destinationOptions.map(({ id: optionId, name }) => ({
          id: optionId,
          name,
        }))}
        activityOptions={activityOptions.map(({ id: optionId, name }) => ({
          id: optionId,
          name,
        }))}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "tours.publish")}
      />
    </>
  );
}
