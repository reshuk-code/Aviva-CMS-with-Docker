"use client";

import { ImagePlus, X } from "lucide-react";
import { useState } from "react";

import { MediaPicker } from "@/components/cms/media-picker";
import { MediaThumb } from "@/components/cms/media-thumb";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
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
}: {
  id: string;
  name: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [picking, setPicking] = useState(false);

  return (
    <>
      <Field id={id} label={label} hint={hint} error={error}>
        {(props) => (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                {...props}
                name={name}
                value={value}
                onChange={(event) => setValue(event.target.value)}
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
                  onClick={() => setValue("")}
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
