import { DestinationForm } from "@/components/cms/destination-form";
import { PageHeader } from "@/components/cms/page-header";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { destinations } from "@/lib/cms/repositories/destinations";
import { settings } from "@/lib/cms/repositories/settings";

export const metadata = { title: "New destination" };

export default async function NewDestinationPage() {
  const session = await requirePermission("destinations.create");

  const [countries, siteUrl] = await Promise.all([
    destinations.countries(),
    settings.siteUrl(),
  ]);

  return (
    <>
      <PageHeader
        title="New destination"
        breadcrumbs={[
          { label: "Destinations", href: "/admin/destinations" },
          { label: "New destination" },
        ]}
      />

      <DestinationForm
        destination={null}
        countryOptions={countries}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "destinations.publish")}
      />
    </>
  );
}
