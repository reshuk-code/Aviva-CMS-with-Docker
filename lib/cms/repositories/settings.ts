import "server-only";

import { getCmsConfig } from "@/lib/cms/config";
import { getDatabase } from "@/lib/database";
import type { SiteSettings } from "@/types/settings";
import { EMPTY_SEO } from "@/types/seo";

const KV_KEY = "site_settings";

/**
 * Settings repository.
 *
 * Settings are a singleton, stored in the adapter's key/value area. Stored
 * values are merged over defaults derived from `cms.config.ts`, so a project
 * that has never opened the Settings screen still gets a sane site name and
 * URL, and adding a new setting never needs a data migration.
 */
function defaults(): SiteSettings {
  const config = getCmsConfig();

  return {
    siteName: config.siteName,
    tagline: "",
    logo: null,
    favicon: null,
    siteUrl: config.siteUrl,
    locale: config.defaultLocale,
    timezone: "Asia/Kathmandu",
    contact: { email: null, phone: null, whatsapp: null, address: null },
    social: {
      facebook: null,
      instagram: null,
      twitter: null,
      youtube: null,
      tripadvisor: null,
    },
    defaultSeo: {
      title: null,
      description: null,
      ogImage: null,
      twitterCard: EMPTY_SEO.twitterCard,
      robots: EMPTY_SEO.robots,
    },
    integrations: {
      googleAnalyticsId: null,
      googleTagManagerId: null,
      facebookPixelId: null,
      googleSiteVerification: null,
    },
    maintenanceMode: false,
  };
}

export const settings = {
  async get(): Promise<SiteSettings> {
    const db = await getDatabase();
    const stored = await db.kv.get<Partial<SiteSettings>>(KV_KEY);
    const base = defaults();

    if (!stored) return base;

    // One level of nesting is all the shape has, so an explicit merge is
    // clearer (and safer) than a generic deep-merge helper.
    return {
      ...base,
      ...stored,
      contact: { ...base.contact, ...stored.contact },
      social: { ...base.social, ...stored.social },
      defaultSeo: { ...base.defaultSeo, ...stored.defaultSeo },
      integrations: { ...base.integrations, ...stored.integrations },
    };
  },

  async update(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.get();
    const next: SiteSettings = {
      ...current,
      ...patch,
      contact: { ...current.contact, ...patch.contact },
      social: { ...current.social, ...patch.social },
      defaultSeo: { ...current.defaultSeo, ...patch.defaultSeo },
      integrations: { ...current.integrations, ...patch.integrations },
    };

    const db = await getDatabase();
    await db.kv.set(KV_KEY, next);
    return next;
  },

  /** Public origin used for canonicals, OG images and the sitemap. */
  async siteUrl(): Promise<string> {
    const stored = await this.get();
    return (stored.siteUrl || getCmsConfig().siteUrl).replace(/\/+$/, "");
  },
};
