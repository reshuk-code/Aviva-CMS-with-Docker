import { HeaderForm } from "@/app/admin/(dashboard)/settings/header/header-form";
import { PageHeader } from "@/components/cms/page-header";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { settings } from "@/lib/cms/repositories/settings";

export const metadata = { title: "Header" };

export default async function HeaderSettingsPage() {
  const session = await requirePermission("settings.read");
  const current = await settings.get();

  return (
    <>
      <PageHeader
        title="Header"
        description="The announcement bar, the call-to-action button and what sits beside the menu. Links themselves live under Navigation."
        breadcrumbs={[
          { label: "Site settings", href: "/admin/settings" },
          { label: "Header" },
        ]}
      />

      <HeaderForm
        header={current.header}
        hasContactDetails={Boolean(current.contact.phone || current.contact.email)}
        readOnly={!hasPermission({ role: session.role }, "settings.update")}
      />
    </>
  );
}
