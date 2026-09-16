"use client";

import { ImagePlus, X } from "lucide-react";
import { useState } from "react";

import { hasMediaDrag, readMediaDragData } from "@/components/cms/media-drag";
import { MediaPicker } from "@/components/cms/media-picker";
import { MediaThumb } from "@/components/cms/media-thumb";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * An image URL input with a media picker beside it.
 *
 * The field still posts a plain URL string, so every content model keeps
 * storing a URL and nothing downstream — the frontend, the SEO bridge, the
 * adapters — needs to know the media library exists. Typing a URL from
 * somewhere else remains valid, which matters for images hosted on a CDN the
 * CMS does not manage.
 *
 * TODO(phase-3): store the media id alongside the URL so a moved or deleted
 * file can be traced back to the pages using it.
 */
export function ImageField({
  id,
  name,
  label,
  hint,
  error,
  defaultValue = "",
  placeholder,
  onValueChange,
}: {
  id: string;
  name: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  /**
   * Mirrors the value out for callers that manage their own state — the block
   * editor keeps the whole page body in one JSON field, so the hidden input
   * this component posts is ignored there.
   */
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);

  function update(next: string) {
    setValue(next);
    onValueChange?.(next);
  }
  const [picking, setPicking] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <>
      <Field id={id} label={label} hint={hint} error={error}>
        {(props) => (
          <div
            className={cn(
              "space-y-2 rounded-md",
              dragging && "outline outline-2 outline-offset-4 outline-primary",
            )}
            onDragOver={(event) => {
              // Only claim the drag if it is one of ours, so dropping a file
              // from the desktop still does whatever the browser would do.
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
              update(payload.url);
            }}
          >
            <div className="flex items-center gap-2">
              <Input
                {...props}
                name={name}
                value={value}
                onChange={(event) => update(event.target.value)}
                placeholder={placeholder}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPicking(true)}
                className="shrink-0"
              >
                <ImagePlus className="size-4" />
                Choose
              </Button>
            </div>

            {value ? (
              <div className="flex items-center gap-2">
                <div className="size-14 shrink-0 overflow-hidden rounded-md border border-border">
                  <MediaThumb url={value} kind="image" alt="" />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => update("")}
                >
                  <X className="size-4" />
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </Field>

      <MediaPicker
        open={picking}
        onOpenChange={setPicking}
        onSelect={(item) => setValue(item.url)}
      />
    </>
  );
}
