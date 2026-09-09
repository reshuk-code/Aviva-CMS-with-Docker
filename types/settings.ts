import type { SeoMeta } from "./seo";

/** Site-wide settings editable from /admin/settings. */
export interface SiteSettings {
  siteName: string;
  tagline: string;
  logo: string | null;
  favicon: string | null;
  /** Canonical public origin, e.g. "https://example.com". No trailing slash. */
  siteUrl: string;
  locale: string;
  timezone: string;
  contact: {
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
  };
  social: {
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    youtube: string | null;
    tripadvisor: string | null;
  };
  /** Defaults applied when an entity leaves its own SEO fields blank. */
  defaultSeo: Pick<
    SeoMeta,
    "title" | "description" | "ogImage" | "twitterCard" | "robots"
  >;
  /** Site-wide analytics / verification snippets. Rendered in <head>. */
  integrations: {
    googleAnalyticsId: string | null;
    googleTagManagerId: string | null;
    facebookPixelId: string | null;
    googleSiteVerification: string | null;
  };
  maintenanceMode: boolean;
}

export interface Redirect {
  id: string;
  source: string;
  destination: string;
  permanent: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
