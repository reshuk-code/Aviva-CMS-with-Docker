"use client";

import { GalleryField } from "@/components/cms/gallery-field";
import { ImageField } from "@/components/cms/image-field";
import { UsedMediaPanel } from "@/components/cms/used-media-panel";
import { BANNER_DIMENSIONS } from "@/lib/images";

/**
 * The four featured-image slots and the gallery, as one block.
 *
 * Shared by every content editor rather than repeated in four forms, because
 * the slots are a contract with the frontend: `pickImage()` reads these exact
 * field names, and a form that offered three of them would produce records the
 * layouts silently fall back on.
 *
 * Each slot is a plain `ImageField`, so the whole thing stays a normal
 * `FormData` read and a URL from an unmanaged CDN is still valid.
 */
export function FeaturedImagesField({
  record,
  errors = {},
  /** Mirrors the normal image out, for the SEO panel's featured-image check. */
  onFeaturedChange,
}: {
  record: {
    featuredImage?: string | null;
    featuredImageHorizontal?: string | null;
    featuredImageVertical?: string | null;
    bannerImage?: string | null;
    gallery?: string[];
  } | null;
  errors?: Record<string, string[]>;
  onFeaturedChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <ImageField
          id="featuredImage"
          name="featuredImage"
          label="Normal"
          error={errors.featuredImage?.[0]}
          defaultValue={record?.featuredImage ?? ""}
          onValueChange={onFeaturedChange}
        />

        <ImageField
          id="featuredImageHorizontal"
          name="featuredImageHorizontal"
          label="Horizontal"
          error={errors.featuredImageHorizontal?.[0]}
          defaultValue={record?.featuredImageHorizontal ?? ""}
        />

        <ImageField
          id="featuredImageVertical"
          name="featuredImageVertical"
          label="Vertical"
          /*
           * The one slot whose presence changes a layout rather than just
           * supplying a file, so it says so. Everything else here is a
           * labelled box and needs no prose.
           */
          hint="Set this and listings show a tall card."
          error={errors.featuredImageVertical?.[0]}
          defaultValue={record?.featuredImageVertical ?? ""}
        />

        <ImageField
          id="bannerImage"
          name="bannerImage"
          label="Banner"
          hint={`${BANNER_DIMENSIONS.width}×${BANNER_DIMENSIONS.height}px`}
          error={errors.bannerImage?.[0]}
          defaultValue={record?.bannerImage ?? ""}
        />
      </div>

      <div className="border-t border-border pt-5">
        <GalleryField
          name="gallery"
          label="Photo gallery"
          defaultValue={record?.gallery ?? []}
        />
      </div>

      {/*
        Below the gallery, not above it: this is a reference shelf, and putting
        it first would bury the one control on the tab that actually saves
        something.
      */}
      <div className="border-t border-border pt-5">
        <UsedMediaPanel />
      </div>
    </div>
  );
}
