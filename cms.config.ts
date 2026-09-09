import { defineCmsConfig } from "@/lib/cms/define-config";

/**
 * Per-project CMS configuration.
 *
 * This is the file a developer edits when starting a new client site: rename
 * the site, pick a backend, and switch off the modules that client will never
 * use (they disappear from the admin sidebar and their routes 404).
 *
 * `CMS_DATABASE`, `CMS_STORAGE` and `NEXT_PUBLIC_SITE_URL` override the values
 * here at runtime, so staging and production can differ without a code change.
 */
export default defineCmsConfig({
  siteName: "Aviva Travel Starter",
  siteUrl: "http://localhost:3000",

  // "local" needs no credentials and stores JSON under .cms-data/.
  // Switch to "supabase" once SUPABASE_* env vars are set.
  database: "local",
  storage: "local",

  modules: {
    pages: true,
    blog: true,
    media: true,
    destinations: true,
    tours: true,
    activities: true,
    testimonials: true,
    faqs: true,
    navigation: true,
    seo: true,
    redirects: true,
    settings: true,
    enquiries: true,
    // Off until the booking engine lands (see docs/ROADMAP.md).
    bookings: false,
    customers: false,
    users: true,
    roles: true,
    integrations: true,
    database: true,
    developer: true,
  },

  admin: {
    basePath: "/admin",
    brandName: "Aviva CMS",
    themeToggle: true,
  },

  frontend: {
    catchAllRoutes: true,
    sitemap: true,
  },
});
