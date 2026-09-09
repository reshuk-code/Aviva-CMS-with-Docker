import { NextResponse, type NextRequest } from "next/server";

import { requirePermission } from "@/lib/auth";
import { CmsError } from "@/lib/cms/errors";
import { media } from "@/lib/cms/repositories/media";
import { mediaListOptionsSchema } from "@/schemas/media";

/**
 * Media browsing for the picker dialog.
 *
 * The picker opens inside forms all over the admin and needs to search and
 * paginate without navigating away, which a Server Component cannot do — so
 * this is the one read the CMS exposes over HTTP. It is gated on `media.read`
 * like every other path to the same data.
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission("media.read");

    const params = request.nextUrl.searchParams;
    const options = mediaListOptionsSchema.parse({
      page: params.get("page") ?? undefined,
      perPage: params.get("perPage") ?? undefined,
      search: params.get("search") ?? undefined,
      kind: params.get("kind") ?? undefined,
      folder: params.get("folder") ?? undefined,
    });

    const [result, folders] = await Promise.all([
      media.list(options),
      media.folders(),
    ]);

    return NextResponse.json(
      { ...result, folders },
      // Media changes as soon as someone uploads; a stale picker is confusing.
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof CmsError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("[cms] Media listing failed:", error);
    return NextResponse.json(
      { error: "Could not load the media library." },
      { status: 500 },
    );
  }
}
