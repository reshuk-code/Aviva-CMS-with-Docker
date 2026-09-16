import { FooterForm } from "@/app/admin/(dashboard)/settings/footer/footer-form";
import { PageHeader } from "@/components/cms/page-header";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { navigation } from "@/lib/cms/repositories/navigation";
import { settings } from "@/lib/cms/repositories/settings";

export const metadata = { title: "Footer" };

export default async function FooterSettingsPage() {
  const session = await requirePermission("settings.read");

  const [current, menus] = await Promise.all([
    settings.get(),
    navigation.listMenus(),
  ]);

  return (
    <>
      <PageHeader
        title="Footer"
        description="What appears at the bottom of every page: your description, link columns, social links and small print."
        breadcrumbs={[
          { label: "Site settings", href: "/admin/settings" },
          { label: "Footer" },
        ]}
      />

      <FooterForm
        footer={current.footer}
        menus={menus.map(({ key, name }) => ({ key, name }))}
        siteName={current.siteName}
        readOnly={!hasPermission({ role: session.role }, "settings.update")}
      />
    </>
  );
}
