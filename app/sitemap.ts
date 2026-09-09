import type { MetadataRoute } from "next";

import developerRoutes from "@/config/routes";
import { cms } from "@/lib/cms";
import { getCmsConfig } from "@/lib/cms/config";

/**
 * Sitemap, generated from CMS content plus the developer's declared routes.
 *
 * Declared routes are included because the CMS otherwise has no way to know
 * `/tours` exists — which is exactly what the route registry is for (§6).
 * Routes with dynamic segments are skipped: only the owning code knows what
 * the valid values are, so it should add them itself.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const config = getCmsConfig();
  if (!config.frontend.sitemap) return [];

  const [site, pages] = await Promise.all([
    cms.settings.get(),
    cms.pages.getPublished(),
  ]);

  const origin = (site.siteUrl || config.siteUrl).replace(/\/+$/, "");

  const cmsSlugs = new Set(pages.map((page) => page.slug));

  const cmsEntries: MetadataRoute.Sitemap = pages
    .filter((page) => page.seo.robots !== "noindex")
    .map((page) => ({
      url: `${origin}${page.slug === "/" ? "" : page.slug}`,
      lastModified: page.updatedAt,
    }));

  const developerEntries: MetadataRoute.Sitemap = developerRoutes
    .filter((route) => !route.path.includes(":") && !cmsSlugs.has(route.path))
    .map((route) => ({
      url: `${origin}${route.path === "/" ? "" : route.path}`,
    }));

  return [...developerEntries, ...cmsEntries];
}
