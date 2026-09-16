"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Full-screen image viewer for the public site.
 *
 * Mounted once in the frontend layout. It wraps nothing: it listens for clicks
 * on `img[data-lightbox]` anywhere in the page, opens whichever was clicked,
 * and treats the rest of the page's marked images as the strip to arrow
 * through.
 *
 * Delegation rather than a wrapper component is the design, and the reason is
 * the render tree. Photographs reach the page from three unrelated places —
 * the rich text renderer, the block renderer, and the detail pages themselves
 * — and all three are Server Components. A wrapper taking an array of images
 * would have to be threaded through every one of them and would drag each
 * across the client boundary. One attribute keeps them all on the server and
 * makes enabling this on a new image a one-word change.
 *
 * Built on `<dialog>`'s modal mode rather than a hand-rolled overlay: the
 * browser supplies focus trapping, inertness for the rest of the page, Escape
 * to close and top-layer stacking, none of which is worth reimplementing.
 */

/** Opt-in marker. Applied in the renderers; styled in `app/globals.css`. */
const SELECTOR = "img[data-lightbox]";

/**
 * The dark surface is the dialog's own background, not `::backdrop`.
 *
 * The element already covers the viewport, so it can be the overlay, and
 * styling it directly sidesteps the `backdrop:` variant — which did not
 * produce a visible surface here, leaving white text on a white page.
 * `backdrop-blur` is the unrelated `backdrop-filter` utility, blurring the
 * page that shows through the remaining tenth.
 */
const OVERLAY_CLASS =
  "fixed inset-0 m-0 h-full max-h-full w-full max-w-full bg-black/90 p-0 " +
  "text-white backdrop-blur-sm";

interface Slide {
  src: string;
  /** The image's own alt text. Empty for decorative grid thumbnails. */
  alt: string;
  /** A `<figcaption>` from the surrounding figure, when there is one. */
  caption: string | null;
}

function toSlide(image: HTMLImageElement): Slide {
  const caption = image
    .closest("figure")
    ?.querySelector("figcaption")
    ?.textContent?.trim();

  return {
    // `currentSrc` is whatever the browser actually chose to load, so the
    // viewer opens the file already in the cache rather than refetching.
    src: image.currentSrc || image.src,
    alt: image.alt,
    caption: caption || null,
  };
}

export function Lightbox() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [index, setIndex] = useState(0);

  const isOpen = slides.length > 0;

  /** Idempotent, because the dialog's own `close` event also calls it. */
  const close = useCallback(() => {
    setSlides((current) => (current.length > 0 ? [] : current));
  }, []);

  // Index is allowed to run outside the array; it is wrapped when read, which
  // is what makes the strip loop at both ends without any bounds arithmetic
  // in the handlers.
  const step = useCallback((delta: number) => {
    setIndex((current) => current + delta);
  }, []);

  /* -------------------------------------------------------------- opening */

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      // Leave modified and non-primary clicks alone, so "open image in new
      // tab" still works for anyone who wants the file itself.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as Element | null;
      const image = target?.closest<HTMLImageElement>(SELECTOR);
      if (!image) return;

      // An image inside a link is part of the link. Navigation wins.
      if (image.closest("a")) return;

      const strip = Array.from(
        document.querySelectorAll<HTMLImageElement>(SELECTOR),
      ).filter((candidate) => !candidate.closest("a"));

      const position = strip.indexOf(image);
      if (position < 0) return;

      event.preventDefault();
      setSlides(strip.map(toSlide));
      setIndex(position);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  /* ------------------------------------------------ syncing the <dialog> */

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  /*
   * A safety net for any close this component did not initiate — a form with
   * `method="dialog"`, or a browser closing the top layer on navigation. The
   * primary Escape path is the keydown handler below, because `close` does not
   * bubble and proved unreliable to observe at all.
   */
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => close();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [close]);

  // Modal mode makes the page inert but does not stop it scrolling behind the
  // overlay, which looks broken when the wheel moves the page under a
  // stationary photograph.
  useEffect(() => {
    if (!isOpen) return;

    const { style } = document.body;
    const previous = style.overflow;
    style.overflow = "hidden";
    return () => {
      style.overflow = previous;
    };
  }, [isOpen]);

  /* --------------------------------------------------------------- render */

  const count = slides.length;
  const position = count > 0 ? ((index % count) + count) % count : 0;
  const current = count > 0 ? slides[position] : null;
  const hasStrip = count > 1;
  const caption = current ? (current.caption ?? (current.alt || null)) : null;

  return (
    <dialog
      ref={dialogRef}
      aria-label="Image viewer"
      onClick={(event) => {
        // Anything that is not the photograph or a control is backdrop.
        if (!(event.target as Element).closest("[data-lightbox-keep]")) close();
      }}
      onKeyDown={(event) => {
        /*
         * Escape is handled here rather than left to the dialog's native
         * cancel, and the default is prevented so the browser does not close
         * the element behind React's back. `close` does not bubble and did not
         * reach a listener at all in testing, so the state and the element
         * would desync: the viewer vanished while React still believed it was
         * open, stranding `overflow: hidden` on the body. `keydown` bubbles,
         * so this path is reliable, and the effect above does the closing.
         */
        if (event.key === "Escape") {
          event.preventDefault();
          close();
          return;
        }

        if (!hasStrip) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        }
      }}
      className={OVERLAY_CLASS}
    >
      {current ? (
        <div className="flex h-full flex-col">
          {/* ----------------------------------------------------- top bar */}
          <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <p className="text-sm tabular-nums text-white/70">
              {hasStrip ? `${position + 1} / ${count}` : ""}
            </p>

            <button
              type="button"
              onClick={close}
              data-lightbox-keep
              aria-label="Close image viewer"
              className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Icon path="M6 6l12 12M18 6L6 18" className="size-6" />
            </button>
          </div>

          {/* ------------------------------------------------------ stage */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
            {hasStrip ? (
              <NavButton
                side="left"
                label="Previous image"
                onClick={() => step(-1)}
              />
            ) : null}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current.src}
              src={current.src}
              alt={current.alt || `Image ${position + 1} of ${count}`}
              data-lightbox-keep
              className="max-h-full max-w-full object-contain"
            />

            {hasStrip ? (
              <NavButton side="right" label="Next image" onClick={() => step(1)} />
            ) : null}
          </div>

          {/* ----------------------------------------------------- caption */}
          <div className="min-h-12 px-4 py-3 text-center sm:px-6">
            {caption ? (
              <p
                data-lightbox-keep
                className="mx-auto max-w-2xl text-sm leading-relaxed text-white/75"
              >
                {caption}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

function NavButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-lightbox-keep
      aria-label={label}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
        side === "left" ? "left-1 sm:left-4" : "right-1 sm:right-4"
      }`}
    >
      <Icon
        path={side === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
        className="size-7"
      />
    </button>
  );
}

/**
 * The three glyphs this viewer needs, drawn inline.
 *
 * `lucide-react` is already a dependency, but it is an admin one — importing
 * it here would put an icon library into the public site's bundle for a cross
 * and two chevrons.
 */
function Icon({ path, className }: { path: string; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}
