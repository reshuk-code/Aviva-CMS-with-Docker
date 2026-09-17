"use client";

import { RefreshCw } from "lucide-react";
import { useRef, useState } from "react";

import { setMediaDragData } from "@/components/cms/media-drag";
import { MediaThumb } from "@/components/cms/media-thumb";
import { Button } from "@/components/ui/button";
import { collectUsedMedia, type UsedMedia } from "@/lib/used-media";

/**
 * Everything this record uses, collected from the form as it stands.
 *
 * Read-only on purpose. The gallery beside it is an editorial sequence — a
 * gallery leads with its best photograph — and silently appending every image
 * that happens to appear in the prose would destroy that ordering on every
 * save. Instead each thumbnail is draggable with the same payload the media
 * drawer writes, so a picture found here can be dropped into the gallery, the
 * banner or any other slot.
 *
 * It reads the DOM rather than lifted state because the values it needs live
 * in six editors that each own theirs, and every one of them already posts a
 * hidden input. `new FormData(form)` is the same read the save path does, so
 * the panel cannot disagree with what is about to be saved.
 *
 * The scan is manual and on mount, not live: it walks every value in the form
 * and parses the JSON ones, which is far too much to redo on each keystroke.
 */
export function UsedMediaPanel() {
  const anchor = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState<UsedMedia[] | null>(null);

  function scanFrom(node: HTMLElement | null) {
    const form = node?.closest("form");
    if (!form) return;
    setItems(collectUsedMedia(new FormData(form).values()));
  }

  /*
   * The first scan hangs off the ref callback rather than an effect. It needs
   * the mounted node to find the form, and the lint rule against
   * setState-in-effect is on for a reason — a ref callback is not one. `null`
   * is the "never scanned" state, so an empty form still reports emptiness
   * once rather than rescanning on every render.
   */
  function attach(node: HTMLDivElement | null) {
    anchor.current = node;
    if (node && items === null) scanFrom(node);
  }

  return (
    <div ref={attach} className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">In use</p>

        <Button type="button" variant="ghost" size="sm" onClick={() => scanFrom(anchor.current)}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      {items && items.length > 0 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {items.map((item) => (
            <li key={item.url}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                draggable
                onDragStart={(event) =>
                  setMediaDragData(event.dataTransfer, {
                    url: item.url,
                    alt: "",
                  })
                }
                title={item.url}
                className="block aspect-square overflow-hidden rounded-md border border-border"
              >
                <MediaThumb url={item.url} kind={item.kind} alt="" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      )}
    </div>
  );
}
