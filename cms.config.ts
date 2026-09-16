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
    // Off for this client. The public /faqs route reads the SDK directly and
    // is not module-gated, so switch that off in the frontend if it should go
    // too.
    faqs: false,
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
    /*
     * Retired rather than pending. The screen it pointed at would have held
     * the analytics and verification IDs that Site Settings already edits, so
     * the sidebar entry is gone; this keeps its row out of the permission
     * matrix at /admin/roles, which lists one row per enabled module.
     */
    integrations: false,
    database: true,
    developer: true,
  },

  admin: {
    basePath: "/admin",
    brandName: "Aviva CMS",
    /*
     * The mark only, not the full lockup the brand also has. This sits in a
     * 36px square beside the brand name, where a wordmark would be both
     * illegible and a second copy of the words already next to it — and the
     * lockup's wordmark is solid black, so it disappears in the dark theme.
     */
    logo: "/brand/logo-mark.png",
    themeToggle: true,
  },

  frontend: {
    catchAllRoutes: true,
    sitemap: true,
  },
});
