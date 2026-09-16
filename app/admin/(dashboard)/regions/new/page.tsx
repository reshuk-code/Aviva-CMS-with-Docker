import { PageHeader } from "@/components/cms/page-header";
import { RegionForm } from "@/components/cms/region-form";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { regions } from "@/lib/cms/repositories/regions";
import { settings } from "@/lib/cms/repositories/settings";

export const metadata = { title: "New region" };

export default async function NewRegionPage() {
  const session = await requirePermission("regions.create");

  const [countries, siteUrl] = await Promise.all([
    regions.countries(),
    settings.siteUrl(),
  ]);

  return (
    <>
      <PageHeader
        title="New region"
        breadcrumbs={[
          { label: "Regions", href: "/admin/regions" },
          { label: "New region" },
        ]}
      />

      <RegionForm
        region={null}
        countryOptions={countries}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "regions.publish")}
      />
    </>
  );
}
