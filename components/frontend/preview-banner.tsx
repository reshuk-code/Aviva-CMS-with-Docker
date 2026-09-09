import Link from "next/link";

import type { ContentStatus } from "@/types/common";

/** Shown on the public site while an editor is previewing unpublished content. */
export function PreviewBanner({
  status,
  path,
}: {
  status: ContentStatus;
  path: string;
}) {
  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-500 px-4 py-2 text-center text-sm text-black">
      <span>
        You are previewing a <strong>{status}</strong> page. Visitors cannot see
        this yet.
      </span>
      <Link
        href={`/api/cms/preview/exit?back=${encodeURIComponent(path)}`}
        className="font-medium underline underline-offset-2"
      >
        Exit preview
      </Link>
    </div>
  );
}
