import { pickImage, prefersVerticalCard, SHAPE_RATIO, type ImageShape } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { FeaturedImageSet } from "@/types/content";

/**
 * A record's featured image, in whichever shape the layout asked for.
 *
 * Card grids pass `shape="card"`, which is the client's rule made concrete:
 * a record that has a vertical image is drawn as a portrait tile, and one that
 * has not keeps the landscape tile the grid has always used. That decision is
 * per record, not per grid, so a listing can mix the two — which is the point,
 * since a client fills in vertical images for the trips they want to stand out.
 *
 * A plain `<img>`, like everywhere else on the frontend: the URL comes from
 * whichever storage adapter the project uses, and `next/image` would need
 * per-project `remotePatterns`.
 *
 * The box renders even with no image so a grid does not jump as rows load.
 */
export function FeaturedImage({
  record,
  shape = "normal",
  alt = "",
  className,
  priority = false,
}: {
  record: Partial<FeaturedImageSet> | null | undefined;
  /** `card` resolves to vertical or normal per record; the rest are literal. */
  shape?: ImageShape | "card";
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const resolved: ImageShape =
    shape === "card"
      ? prefersVerticalCard(record)
        ? "vertical"
        : "normal"
      : shape;

  const src = pickImage(record, resolved);

  return (
    <div
      style={{ aspectRatio: SHAPE_RATIO[resolved] }}
      className={cn("w-full overflow-hidden bg-muted", className)}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : null}
    </div>
  );
}
