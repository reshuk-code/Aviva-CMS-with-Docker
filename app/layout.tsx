import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { settings } from "@/lib/cms/repositories/settings";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
