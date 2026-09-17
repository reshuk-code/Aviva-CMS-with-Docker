"use client";

import { Search } from "lucide-react";

import { useFormSections } from "@/components/cms/form-sections";
import { Card } from "@/components/ui/card";

/**
 * The rail's shortcut to the SEO card.
 *
 * SEO sits in its own card below the tabbed content panel — it is about how
 * the page is found rather than what is on it, and burying it behind a tab put
 * it in the wrong argument. That leaves it off the bottom of a long form,
 * which is what this is for.
 *
 * It opens the card *before* scrolling, because a collapsed section measures
 * as zero height and scrolling first lands the viewport short. The two frames
 * are the wait `FormSectionNav` uses: the browser has to paint the opened card
 * before its position is worth reading.
 */
const SEO_SECTION_ID = "section-seo";

/** Clears the sticky admin header, which would otherwise cover the heading. */
const HEADER_OFFSET = 96;

export function SeoJumpCard() {
  const sections = useFormSections();
  if (!sections?.sections.some((section) => section.id === SEO_SECTION_ID)) {
    return null;
  }

  function jump() {
    sections?.open(SEO_SECTION_ID);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = document.getElementById(SEO_SECTION_ID);
        if (!element) return;
        window.scrollTo({
          top: window.scrollY + element.getBoundingClientRect().top - HEADER_OFFSET,
          behavior: "smooth",
        });
      });
    });
  }

  return (
    <Card>
      <button
        type="button"
        onClick={jump}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4 text-muted-foreground" />
        SEO
      </button>
    </Card>
  );
}
