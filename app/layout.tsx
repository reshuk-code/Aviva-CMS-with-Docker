import type { Metadata } from "next";
import { Mulish } from "next/font/google";

import { settings } from "@/lib/cms/repositories/settings";

import "./globals.css";

/**
 * The only webfont the template loads.
 *
 * One family, by client instruction — `--font-mono` points here too, so there
 * is no second download and no second typeface anywhere in the admin or the
 * site. See the note beside those tokens in `globals.css`.
 */
const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Root metadata comes from CMS settings, so a client renaming their site in
 * /admin updates the browser title everywhere without a deploy.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await settings.get();

  return {
    metadataBase: site.siteUrl ? new URL(site.siteUrl) : undefined,
    title: {
      default: site.siteName,
      template: `%s · ${site.siteName}`,
    },
    description: site.defaultSeo.description ?? (site.tagline || undefined),
    icons: site.favicon ? { icon: site.favicon } : undefined,
    verification: site.integrations.googleSiteVerification
      ? { google: site.integrations.googleSiteVerification }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${mulish.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
