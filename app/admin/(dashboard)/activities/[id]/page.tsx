import { notFound } from "next/navigation";

import { ActivityForm } from "@/components/cms/activity-form";
import { PageHeader } from "@/components/cms/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { activities } from "@/lib/cms/repositories/activities";
import { settings } from "@/lib/cms/repositories/settings";
import { tours } from "@/lib/cms/repositories/tours";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Edit activity" };

export default async function EditActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("activities.update");
  const { id } = await params;

  const [activity, icons, usage, siteUrl] = await Promise.all([
    activities.get(id),
    activities.icons(),
    tours.activityUsage(),
    settings.siteUrl(),
  ]);

  if (!activity) notFound();

  return (
    <>
      <PageHeader
        title={activity.name}
        description={`Last updated ${formatDateTime(activity.updatedAt)}`}
        breadcrumbs={[
          { label: "Activities", href: "/admin/activities" },
          { label: activity.name },
        ]}
        actions={<StatusBadge status={activity.status} />}
      />

      <ActivityForm
        activity={activity}
        iconOptions={icons}
        usedByTours={usage[activity.id] ?? 0}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "activities.publish")}
      />
    </>
  );
}
