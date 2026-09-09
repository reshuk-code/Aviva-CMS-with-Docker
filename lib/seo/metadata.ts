import "server-only";

import type { Metadata } from "next";

import { seo as seoService, type ResolvedSeo, type SeoSource } from "@/lib/cms/seo";

/**
 * Bridges resolved CMS SEO onto the Next.js Metadata API.
 *
 * Usage in any route — CMS-managed or hand-written:
 *
 *   export async function generateMetadata(): Promise<Metadata> {
 *     const page = await cms.pages.getBySlug("/about");
 *     return generateCmsMetadata({ title: "About", path: "/about", seo: page?.seo });
 *   }
 */
export function toMetadata(resolved: ResolvedSeo): Metadata {
  return {
    title: resolved.title,
    description: resolved.description ?? undefined,
    alternates: { canonical: resolved.canonical },
    robots: {
      index: resolved.robots.index,
      follow: resolved.robots.follow,
      googleBot: {
        index: resolved.robots.index,
        follow: resolved.robots.follow,
      },
    },
    openGraph: {
      title: resolved.ogTitle,
      description: resolved.ogDescription ?? undefined,
      url: resolved.canonical,
      siteName: resolved.siteName,
      type: "website",
      images: resolved.ogImage ? [{ url: resolved.ogImage }] : undefined,
    },
    twitter: {
      card: resolved.twitterCard,
      title: resolved.ogTitle,
      description: resolved.ogDescription ?? undefined,
      images: resolved.ogImage ? [resolved.ogImage] : undefined,
    },
  };
}

export async function generateCmsMetadata(source: SeoSource): Promise<Metadata> {
  return toMetadata(await seoService.get(source));
}

/**
 * JSON-LD for a route, ready to drop into a `<script type="application/ld+json">`.
 * Returns null when the entity has none, so callers can render nothing.
 */
export function structuredDataScript(resolved: ResolvedSeo): string | null {
  if (!resolved.structuredData) return null;
  try {
    // Re-serialise so malformed input cannot inject markup.
    return JSON.stringify(JSON.parse(resolved.structuredData));
  } catch {
    return null;
  }
}
