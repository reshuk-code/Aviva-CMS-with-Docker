import type { CmsPage } from "@/types/page";

/**
 * Route ownership registry.
 *
 * The problem (§6): the CMS needs to know that `/about` is rendered by
 * `app/about/page.tsx` so it can show that in the admin, let an editor manage
 * its metadata, and warn when a CMS page would be shadowed by a hard route.
 *
 * The approach: developers *declare* their routes in `config/routes.ts`. No
 * filesystem walking and no source parsing at runtime — both are fragile, and
 * neither works once the app is bundled. Declaration is a two-line change that
 * a WordPress developer immediately understands, and it is the only mechanism
 * that stays correct in production.
 *
 * Drift is caught by `npm run cms:routes`, a development-time script that
 * compares `app/` against this registry and reports anything unregistered.
 */
export type RouteOwner =
  /** A hand-written Next.js route. The developer owns rendering. */
  | "developer"
  /** A CMS page rendered by the `app/[...slug]` catch-all. */
  | "cms"
  /** Framework/CMS infrastructure: /admin, /api, /sitemap.xml. */
  | "system";

export interface DeveloperRoute {
  /** Leading-slashed path, e.g. "/tours". Dynamic segments use ":param". */
  path: string;
  /** Shown in the admin route inventory. Defaults to the path. */
  label?: string;
  /**
   * Let editors manage this route's SEO from the admin even though the page
   * is hand-written. The route then reads a CMS page record with the same slug
   * and applies its metadata, while keeping full control of the markup.
   */
  cmsMetadata?: boolean;
  /** Short note for the team, shown in the inventory. */
  description?: string;
}

export interface RouteEntry {
  path: string;
  owner: RouteOwner;
  label: string;
  cmsMetadata: boolean;
  description?: string;
  /** Set for CMS routes. */
  pageId?: string;
  status?: string;
  /** True when a CMS page slug collides with a hard route and will never render. */
  shadowed?: boolean;
}

/** Routes the platform itself owns. Not editable, shown for completeness. */
export const SYSTEM_ROUTES: DeveloperRoute[] = [
  { path: "/admin", label: "Admin panel", description: "CMS interface" },
  { path: "/api", label: "API routes", description: "Route handlers" },
  { path: "/sitemap.xml", label: "Sitemap", description: "Generated from CMS content" },
  { path: "/robots.txt", label: "Robots", description: "Generated from settings" },
];

/**
 * Identity helper for `config/routes.ts`. Normalises paths so comparisons
 * against a request pathname or a page slug are exact.
 */
export function defineRoutes(routes: DeveloperRoute[]): DeveloperRoute[] {
  return routes.map((route) => ({
    ...route,
    path: normaliseRoutePath(route.path),
  }));
}

export function normaliseRoutePath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const trimmed = withSlash.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Does a concrete pathname match a declared route (including ":param")? */
export function matchesRoute(routePath: string, pathname: string): boolean {
  if (routePath === pathname) return true;
  if (!routePath.includes(":")) return false;

  const routeParts = routePath.split("/");
  const pathParts = pathname.split("/");
  if (routeParts.length !== pathParts.length) return false;

  return routeParts.every(
    (part, index) => part.startsWith(":") || part === pathParts[index],
  );
}

/**
 * Builds the full route inventory shown at /admin/developer.
 *
 * Ordering matters: a hand-written route always wins, because Next.js matches
 * static segments before a catch-all. A CMS page whose slug collides is marked
 * `shadowed` so the editor is told why their page is not appearing, rather
 * than being left to guess (§7).
 */
export function buildRouteInventory(
  developerRoutes: DeveloperRoute[],
  cmsPages: Pick<CmsPage, "id" | "slug" | "title" | "status">[],
): RouteEntry[] {
  const developerPaths = new Set(developerRoutes.map((route) => route.path));

  const developerEntries: RouteEntry[] = developerRoutes.map((route) => ({
    path: route.path,
    owner: "developer",
    label: route.label ?? route.path,
    cmsMetadata: route.cmsMetadata ?? false,
    description: route.description,
  }));

  const cmsEntries: RouteEntry[] = cmsPages
    .filter((page) => page.status !== "trash")
    .map((page) => ({
      path: normaliseRoutePath(page.slug),
      owner: "cms",
      label: page.title,
      cmsMetadata: true,
      pageId: page.id,
      status: page.status,
      shadowed: developerPaths.has(normaliseRoutePath(page.slug)),
    }));

  const systemEntries: RouteEntry[] = SYSTEM_ROUTES.map((route) => ({
    path: route.path,
    owner: "system",
    label: route.label ?? route.path,
    cmsMetadata: false,
    description: route.description,
  }));

  return [...developerEntries, ...cmsEntries, ...systemEntries].sort((a, b) =>
    a.path.localeCompare(b.path),
  );
}

export const ROUTE_OWNER_LABELS: Record<RouteOwner, string> = {
  developer: "Developer route",
  cms: "CMS page",
  system: "System route",
};
