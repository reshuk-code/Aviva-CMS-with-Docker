import { defineRoutes } from "@/lib/cms/routes";

/**
 * Hand-written routes in this project.
 *
 * Declare every route you build under `app/` that a client might otherwise
 * expect to manage from the CMS. The admin shows the result at
 * /admin/developer, so nobody has to guess who owns `/tours`.
 *
 * You are not obliged to register a route — an undeclared route still works
 * perfectly. Registering it buys you two things:
 *   1. It appears in the admin route inventory instead of looking missing.
 *   2. With `cmsMetadata: true`, editors can manage its SEO from the CMS while
 *      you keep complete control of the rendering.
 *
 * Run `npm run cms:routes` to list routes in app/ that are not declared here.
 */
export default defineRoutes([
  {
    path: "/",
    label: "Home",
    cmsMetadata: true,
    description: "Hand-built landing page.",
  },
]);
