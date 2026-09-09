import { notFound } from "next/navigation";

import { DestinationForm } from "@/components/cms/destination-form";
import { PageHeader } from "@/components/cms/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { destinations } from "@/lib/cms/repositories/destinations";
import { settings } from "@/lib/cms/repositories/settings";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Edit destination" };

export default async function EditDestinationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("destinations.update");
  const { id } = await params;

  const [destination, countries, siteUrl] = await Promise.all([
    destinations.get(id),
    destinations.countries(),
    settings.siteUrl(),
  ]);

  if (!destination) notFound();

  return (
    <>
      <PageHeader
        title={destination.name}
        description={`Last updated ${formatDateTime(destination.updatedAt)}`}
        breadcrumbs={[
          { label: "Destinations", href: "/admin/destinations" },
          { label: destination.name },
        ]}
        actions={<StatusBadge status={destination.status} />}
      />

      <DestinationForm
        destination={destination}
        countryOptions={countries}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "destinations.publish")}
      />
    </>
  );
}
