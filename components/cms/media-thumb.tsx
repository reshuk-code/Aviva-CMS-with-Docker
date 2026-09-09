import { FileAudio, FileText, FileVideo, File as FileIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { MediaKind } from "@/types/content";

const ICONS: Record<Exclude<MediaKind, "image">, typeof FileIcon> = {
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
  other: FileIcon,
};

/**
 * Square preview of one media item: the image itself, or an icon for the
 * kinds a browser cannot show inline.
 *
 * Shared by the library grid and the picker so the two never drift apart.
 */
export function MediaThumb({
  url,
  kind,
  alt,
  className,
}: {
  url: string;
  kind: MediaKind;
  alt: string;
  className?: string;
}) {
  if (kind === "image") {
    return (
      // A plain <img> for the same reason as the frontend renderer: the URL
      // comes from whichever storage adapter the project uses, so next/image
      // would need per-project remotePatterns.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={cn("size-full bg-muted object-cover", className)}
      />
    );
  }

  const Icon = ICONS[kind];

  return (
    <div
      className={cn(
        "flex size-full items-center justify-center bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-8" aria-hidden="true" />
      <span className="sr-only">{alt}</span>
    </div>
  );
}
