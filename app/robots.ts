import type { MetadataRoute } from "next";

import { cms } from "@/lib/cms";
import { getCmsConfig } from "@/lib/cms/config";

/**
 * robots.txt.
 *
 * A site-wide "noindex" in Settings, or maintenance mode, blocks crawlers
 * entirely — the switch a client needs while a site is still being built.
 */
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = getCmsConfig();
  const site = await cms.settings.get();
  const origin = (site.siteUrl || config.siteUrl).replace(/\/+$/, "");

  const blocked = site.defaultSeo.robots === "noindex" || site.maintenanceMode;

  return {
    rules: blocked
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: config.frontend.sitemap ? `${origin}/sitemap.xml` : undefined,
  };
}
