"use client";

import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { useState } from "react";

import { hasMediaDrag, readMediaDragData } from "@/components/cms/media-drag";
import { MediaPicker } from "@/components/cms/media-picker";
import { MediaThumb } from "@/components/cms/media-thumb";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * An ordered list of image URLs, picked from the media library.
 *
 * Order is part of the content — a gallery leads with its best photograph — so
 * the arrows are not decoration. Each image posts as its own hidden input of
 * the same name, which is how `FormData.getAll()` reconstructs the array.
 */
export function GalleryField({
  name,
  label = "Gallery",
  hint,
  defaultValue = [],
  onValueChange,
}: {
  name: string;
  label?: string;
  hint?: string;
  defaultValue?: string[];
  /** Mirrors the list out. See the note on ImageField's onValueChange. */
  onValueChange?: (urls: string[]) => void;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);

  /**
   * Resolves the next list, then sets state and notifies the parent.
   *
   * Deliberately not `setUrls(current => …)`: React may invoke an updater more
   * than once, so calling the parent's onValueChange from inside one would fire
   * a second component's setState an unpredictable number of times.
   */
  function update(next: string[] | ((current: string[]) => string[])) {
    const resolved = typeof next === "function" ? next(urls) : next;
    setUrls(resolved);
    onValueChange?.(resolved);
  }
  const [picking, setPicking] = useState(false);
  const [dragging, setDragging] = useState(false);

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= urls.length) return;

    update((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <div
      className={cn(
        "space-y-2 rounded-md",
        dragging && "outline outline-2 outline-offset-4 outline-primary",
      )}
      onDragOver={(event) => {
        if (!hasMediaDrag(event.dataTransfer)) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        const payload = readMediaDragData(event.dataTransfer);
        setDragging(false);
        if (!payload) return;
        event.preventDefault();
        // Same rule as the picker: a duplicate would render twice and confuse
        // the move buttons, which key on the URL.
        update((current) =>
          current.includes(payload.url) ? current : [...current, payload.url],
        );
      }}
    >
      <Label>{label}</Label>

      {urls.map((url) => (
        <input key={url} type="hidden" name={name} value={url} />
      ))}

      {urls.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url, index) => (
            <li
              key={`${url}-${index}`}
              className="overflow-hidden rounded-md border border-border"
            >
              <div className="aspect-square">
                <MediaThumb url={url} kind="image" alt="" />
              </div>

              <div className="flex items-center justify-between px-1 py-0.5">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label={`Move image ${index + 1} earlier`}
                >
                  <ChevronLeft className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    update((current) => current.filter((_, i) => i !== index))
                  }
                  className="rounded p-0.5 text-destructive hover:opacity-80"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === urls.length - 1}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label={`Move image ${index + 1} later`}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setPicking(true)}
      >
        <ImagePlus className="size-4" />
        Add image
      </Button>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onSelect={(item) =>
          // Adding the same file twice would render a duplicate and confuse the
          // move buttons, which key on the URL.
          update((current) =>
            current.includes(item.url) ? current : [...current, item.url],
          )
        }
      />
    </div>
  );
}
