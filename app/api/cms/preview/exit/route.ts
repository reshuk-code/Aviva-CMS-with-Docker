import { draftMode } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/** Leaves preview mode and returns to the page the editor was viewing. */
export async function GET(request: NextRequest) {
  const draft = await draftMode();
  draft.disable();

  const back = request.nextUrl.searchParams.get("back");
  const target = back && back.startsWith("/") && !back.startsWith("//") ? back : "/";

  return NextResponse.redirect(new URL(target, request.nextUrl.origin));
}
