import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/admin/auth-actions";
import { AdminHeader } from "@/components/cms/admin-header";
import { Sidebar } from "@/components/cms/sidebar";
import { getSession } from "@/lib/auth";
import { permissionsForRole } from "@/lib/auth/permissions";
import { getCmsConfig, getEnabledModules } from "@/lib/cms/config";
import { users } from "@/lib/cms/repositories/users";

/**
 * Authenticated admin shell.
 *
 * THIS is the authentication boundary for admin pages. `middleware.ts` only
 * looks for the presence of a cookie; here the session is verified, the user
 * is re-read from the database (so a deactivated account loses access
 * immediately), and permissions are resolved for the sidebar.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await users.isFirstRun()) redirect("/admin/setup");

  const session = await getSession();
  if (!session) redirect("/admin/login");

  const user = await users.get(session.userId);
  if (!user || !user.active) redirect("/admin/login");

  const config = getCmsConfig();
  const granted = [
    ...permissionsForRole(user.role),
    ...user.extraPermissions,
  ];

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar
        enabledModules={getEnabledModules()}
        grantedPermissions={granted}
        brandName={config.admin.brandName ?? config.siteName}
      />

      <div className="lg:pl-64">
        <AdminHeader
          user={{ name: user.name, email: user.email, role: user.role }}
          themeToggle={config.admin.themeToggle}
          signOutAction={signOutAction}
        />

        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
