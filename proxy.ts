import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin gate (Next.js 16 `proxy` convention, formerly `middleware`).
 *
 * The CMS's own check here ONLY looks for the presence of a session cookie, so
 * an unauthenticated visitor lands on the sign-in page instead of a flash of
 * empty admin chrome. It is a routing convenience, not a security boundary:
 * the cookie is not verified here and its contents are not trusted.
 *
 * Real authentication and authorisation happen server-side in
 * `app/admin/(dashboard)/layout.tsx` and in every server action, via
 * `requireSession()` / `requirePermission()` (§17, §24.4).
 *
 * Why not verify here: signature checking needs the session secret, and
 * matching redirects needs the database — neither belongs in a function that
 * runs on every request. Both are done where the data already is.
 *
 * CLERK: when Clerk is the active provider it must run its own middleware, or
 * `auth()` throws in Server Components. That is decided from the environment
 * rather than the encrypted connections file, because this runs in the Edge
 * runtime where there is no filesystem — which is also why Clerk's keys must
 * be set as environment variables, as the Connections screen says.
 */
const SESSION_COOKIE = "cms_session";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/setup", "/admin/sign-in"];

const CLERK_ACTIVE =
  process.env.CMS_AUTH === "clerk" &&
  Boolean(process.env.CLERK_SECRET_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function cmsGate(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_ADMIN_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Clerk owns the session when it is active, so the CMS cookie check would
  // bounce every signed-in user straight back to the login screen.
  if (CLERK_ACTIVE) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  if (pathname !== "/admin") {
    loginUrl.searchParams.set("next", `${pathname}${search}`);
  }

  return NextResponse.redirect(loginUrl);
}

const withClerk = clerkMiddleware((_auth, request) => cmsGate(request));

export default function proxy(request: NextRequest) {
  return CLERK_ACTIVE
    ? (withClerk as unknown as (r: NextRequest) => Response)(request)
    : cmsGate(request);
}

export const config = {
  matcher: ["/admin", "/admin/((?!login|setup).*)"],
};
