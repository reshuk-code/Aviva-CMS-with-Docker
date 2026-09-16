import "server-only";

import type { SeoMeta } from "@/types/seo";
import { EMPTY_SEO } from "@/types/seo";
import type { SiteSettings } from "@/types/settings";

import { settings as settingsRepo } from "./repositories/settings";

/**
 * SEO resolution.
 *
 * Every publicly addressable entity carries a `seo` object whose fields are
 * usually blank; this layer fills the blanks from the entity itself and then
 * from site defaults, so editors only override what they care about (§11).
 */

/** What any entity must provide for SEO resolution. */
export interface SeoSource {
  seo?: Partial<SeoMeta> | null;
  title: string;
  /** Path relative to the site root, leading slash included. */
  path: string;
  description?: string | null;
  image?: string | null;
}

/** SEO with every fallback applied and URLs made absolute. */
export interface ResolvedSeo {
  title: string;
  description: string | null;
  canonical: string;
  robots: { index: boolean; follow: boolean };
  ogTitle: string;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: SeoMeta["twitterCard"];
  structuredData: string | null;
  siteName: string;
}

function absolute(url: string | null, siteUrl: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}

function pagePath(path: string): string {
  if (path === "/" || path.endsWith("/")) return path;
  return `${path}/`;
}

export function resolveSeo(
  source: SeoSource,
  site: SiteSettings,
): ResolvedSeo {
  const seo = { ...EMPTY_SEO, ...(source.seo ?? {}) };
  const siteUrl = (site.siteUrl || "").replace(/\/+$/, "");

  const title = seo.title ?? source.title;
  const description =
    seo.description ?? source.description ?? site.defaultSeo.description ?? null;
  const image = seo.ogImage ?? source.image ?? site.defaultSeo.ogImage ?? null;

  // A site-wide "noindex" (staging, or a client not ready to launch) wins over
  // any per-page setting. That is the safer direction to fail in.
  const siteNoIndex = site.defaultSeo.robots === "noindex";

  return {
    title,
    description,
    canonical: absolute(seo.canonical ?? pagePath(source.path), siteUrl) ?? pagePath(source.path),
    robots: {
      index: !siteNoIndex && seo.robots !== "noindex",
      follow: !seo.noFollow,
    },
    ogTitle: seo.ogTitle ?? title,
    ogDescription: seo.ogDescription ?? description,
    ogImage: absolute(image, siteUrl),
    twitterCard: seo.twitterCard ?? site.defaultSeo.twitterCard,
    structuredData: seo.structuredData,
    siteName: site.siteName,
  };
}

export const seo = {
  /** Resolves SEO for an entity, loading site settings for you. */
  async get(source: SeoSource): Promise<ResolvedSeo> {
    return resolveSeo(source, await settingsRepo.get());
  },

  resolve: resolveSeo,
};
