import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/cms/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { getCmsConfig } from "@/lib/cms/config";
import { resolveAuth } from "@/lib/connections/resolve";

/**
 * Outer admin layout: providers only.
 *
 * The authenticated chrome (sidebar, header) lives in the `(dashboard)` route
 * group so that /admin/login and /admin/setup can render without it.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin",
  },
  // The admin must never be indexed, whatever the site settings say.
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const config = getCmsConfig();
  const auth = resolveAuth();

  const shell = (
    <ThemeProvider>
      <div data-cms-admin={config.admin.basePath}>{children}</div>
      <Toaster />
    </ThemeProvider>
  );

  // Clerk needs its provider around anything that reads its session. Projects
  // on any other provider never load it.
  if (auth.id === "clerk" && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { ClerkProvider } = await import("@clerk/nextjs");
    return <ClerkProvider>{shell}</ClerkProvider>;
  }

  return shell;
}
