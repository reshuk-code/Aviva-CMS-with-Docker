import { notFound } from "next/navigation";

import { PageHeader } from "@/components/cms/page-header";
import { RegionForm } from "@/components/cms/region-form";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { regions } from "@/lib/cms/repositories/regions";
import { settings } from "@/lib/cms/repositories/settings";
import { describeRecord } from "@/lib/record-meta";

export const metadata = { title: "Edit region" };

export default async function EditRegionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("regions.update");
  const { id } = await params;

  const [region, countries, siteUrl] = await Promise.all([
    regions.get(id),
    regions.countries(),
    settings.siteUrl(),
  ]);

  if (!region) notFound();

  return (
    <>
      <PageHeader
        title={region.name}
        description={describeRecord(region)}
        breadcrumbs={[
          { label: "Regions", href: "/admin/regions" },
          { label: region.name },
        ]}
        actions={<StatusBadge status={region.status} />}
      />

      <RegionForm
        region={region}
        countryOptions={countries}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "regions.publish")}
      />
    </>
  );
}
