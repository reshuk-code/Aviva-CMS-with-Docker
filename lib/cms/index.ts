import "server-only";

import { activity } from "./repositories/activity";
import { destinations } from "./repositories/destinations";
import { media } from "./repositories/media";
import { navigation } from "./repositories/navigation";
import { pages } from "./repositories/pages";
import { posts } from "./repositories/posts";
import { redirects } from "./repositories/redirects";
import { settings } from "./repositories/settings";
import { tours } from "./repositories/tours";
import { users } from "./repositories/users";
import { seo } from "./seo";

/**
 * The CMS SDK.
 *
 * This is the only thing a frontend developer needs to import:
 *
 *   import { cms } from "@/lib/cms";
 *
 *   const page  = await cms.pages.getBySlug("/about");
 *   const menu  = await cms.navigation.get("main");
 *   const site  = await cms.settings.get();
 *
 * Nothing in this object leaks the storage provider. Swapping Supabase for
 * MongoDB is a one-line change in cms.config.ts and no frontend file changes.
 *
 * It is server-only by design: every method reaches a database with privileged
 * credentials. Fetch in a Server Component (or a Server Action / route
 * handler) and pass plain data to Client Components.
 *
 * Phase 2 adds: activities, testimonials, faqs and enquiries.
 * See docs/ROADMAP.md.
 */
export const cms = {
  pages,
  posts,
  destinations,
  tours,
  media,
  navigation,
  settings,
  redirects,
  users,
  activity,
  seo,
} as const;

export type Cms = typeof cms;

export { CmsError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "./errors";
export { getCmsConfig, getEnabledModules, isModuleEnabled } from "./config";
