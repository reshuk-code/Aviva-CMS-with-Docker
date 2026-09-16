import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/admin/auth-actions";
import { AdminHeader } from "@/components/cms/admin-header";
import { Sidebar } from "@/components/cms/sidebar";
import { getSession } from "@/lib/auth";
import { hasPermission, permissionsForRole } from "@/lib/auth/permissions";
import { getCmsConfig, getEnabledModules, isModuleEnabled } from "@/lib/cms/config";
import { enquiries } from "@/lib/cms/repositories/enquiries";
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

  // The badge is a real count or it is absent. A user who cannot read the
  // inbox is not told how full it is.
  const showEnquiries =
    isModuleEnabled("enquiries") &&
    hasPermission({ role: user.role }, "enquiries.read");
  const newEnquiries = showEnquiries ? await enquiries.countNew() : null;

  return (
    <div className="min-h-dvh bg-surface">
      <Sidebar
        enabledModules={getEnabledModules()}
        grantedPermissions={granted}
        brandName={config.admin.brandName ?? config.siteName}
        logo={config.admin.logo}
        user={{ name: user.name, role: user.role }}
        signOutAction={signOutAction}
        newEnquiries={newEnquiries}
      />

      <div className="lg:pl-[17.5rem]">
        {/*
          `pt-4` matters more than it looks: the header is `sticky top-4`, and a
          sticky element only takes that offset once it starts sticking. With no
          top padding it rested flush against the viewport while the sidebar sat
          inset by 16px — the header read as jammed into the top edge.
        */}
        {/*
          The cap used to be 84rem, which on a wide monitor left the content
          centred inside the space beside the sidebar — two dead gutters, the
          left one reading as a large gap next to the navigation. 120rem fills
          a 1080p-and-wider screen outright while still stopping rows from
          stretching to an unreadable length on a 4K display.
        */}
        <div className="mx-auto w-full max-w-[120rem] px-3 pb-4 pt-4 sm:px-4">
          <AdminHeader
            user={{ name: user.name, email: user.email, role: user.role }}
            themeToggle={config.admin.themeToggle}
            signOutAction={signOutAction}
            newEnquiries={newEnquiries}
          />

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
