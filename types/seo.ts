/** Centralised SEO metadata attached to every publicly addressable entity. */
export type RobotsDirective = "index" | "noindex";

export type TwitterCardType = "summary" | "summary_large_image";

export interface SeoMeta {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: RobotsDirective;
  /** Discourage following outbound links. Rarely used, but cheap to support. */
  noFollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  /** Absolute or site-relative URL of the Open Graph image. */
  ogImage: string | null;
  twitterCard: TwitterCardType;
  /** Arbitrary JSON-LD injected verbatim. Validated as JSON before saving. */
  structuredData: string | null;
}

export const EMPTY_SEO: SeoMeta = {
  title: null,
  description: null,
  canonical: null,
  robots: "index",
  noFollow: false,
  ogTitle: null,
  ogDescription: null,
  ogImage: null,
  twitterCard: "summary_large_image",
  structuredData: null,
};
