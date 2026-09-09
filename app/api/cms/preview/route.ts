import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { getSession } from "@/lib/auth";

/**
 * Preview a draft or scheduled page.
 *
 * Enables Next.js draft mode — which also disables caching for the session —
 * and sends the editor to the page's public URL. The catch-all renderer honours
 * draft mode by looking up unpublished content.
 *
 * Access is gated on a valid admin session, so drafts are never reachable by
 * guessing this URL.
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug || !slug.startsWith("/")) {
    return NextResponse.json(
      { error: "Provide a site-relative ?slug=/example." },
      { status: 400 },
    );
  }

  // Only same-origin, path-only destinations: no protocol-relative "//evil.com".
  if (slug.startsWith("//")) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }

  const draft = await draftMode();
  draft.enable();

  return NextResponse.redirect(new URL(slug, request.nextUrl.origin));
}
