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
  {
    path: "/blog",
    label: "Journal",
    cmsMetadata: true,
    // Shadows the CMS page with the same slug on purpose: prose cannot list
    // posts. The page still supplies this route's title and description.
    description: "Post index. Individual posts render at /blog/[slug].",
  },
  {
    path: "/blog/:slug",
    label: "Blog post",
    // Each post carries its own SEO on the record, so there is no CMS page to
    // read metadata from — hence cmsMetadata stays off for this one.
    description: "Renders one post. Honours draft mode, so admin Preview works.",
  },
  {
    path: "/destinations",
    label: "Destinations",
    cmsMetadata: true,
    description: "Destination index. Detail pages render at /destinations/[slug].",
  },
  {
    path: "/destinations/:slug",
    label: "Destination",
    description: "Renders one destination. Honours draft mode for admin Preview.",
  },
  {
    path: "/tours",
    label: "Trips",
    cmsMetadata: true,
    description: "Tour index, filterable by difficulty. Detail at /tours/[slug].",
  },
  {
    path: "/tours/:slug",
    label: "Tour package",
    description:
      "Itinerary, pricing, inclusions and FAQs. Honours draft mode for Preview.",
  },
  {
    path: "/activities",
    label: "Activities",
    cmsMetadata: true,
    description: "Activity index. Detail at /activities/[slug].",
  },
  {
    path: "/activities/:slug",
    label: "Activity",
    description: "One activity and the trips tagged with it.",
  },
  {
    path: "/faqs",
    label: "FAQs",
    cmsMetadata: true,
    description: "Published FAQs, grouped by category via cms.faqs.getGrouped().",
  },
  {
    path: "/contact",
    label: "Contact",
    cmsMetadata: true,
    description:
      "Enquiry form. Posts to cms.enquiries.create(); replies land in /admin/enquiries.",
  },
]);
