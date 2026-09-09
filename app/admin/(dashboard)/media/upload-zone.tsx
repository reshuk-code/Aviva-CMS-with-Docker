"use client";

import { UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { uploadMediaAction } from "@/app/admin/(dashboard)/media/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import { cn } from "@/lib/utils";

/**
 * Upload panel: a drop zone plus the folder and alt-text fields.
 *
 * Dropped files are pushed into the real `<input type="file">` through a
 * DataTransfer, so the whole thing stays one ordinary form post handled by a
 * Server Action — drag and drop is an affordance here, not a second code path.
 */
export function UploadZone({
  folders,
  maxUploadMb,
}: {
  folders: string[];
  maxUploadMb: number;
}) {
  const [state, formAction, pending] = useActionState(uploadMediaAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [names, setNames] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!state.ok) {
      if (state.message) toast.error(state.message);
      return;
    }
    toast.success(state.message ?? "Uploaded.");
    formRef.current?.reset();
    router.refresh();
  }, [state, router]);

  // Clearing the list belongs with the render that shows the new state, not
  // with an effect firing after it — see "adjusting state when a prop changes".
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok && names.length > 0) setNames([]);
  }

  function adopt(files: FileList | null) {
    if (!files || files.length === 0) return;

    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);

    if (inputRef.current) inputRef.current.files = transfer.files;
    setNames([...files].map((file) => file.name));
  }

  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardBody>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              adopt(event.dataTransfer.files);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input px-6 py-8 text-center transition-colors",
              dragging && "border-primary bg-muted/60",
            )}
          >
            <UploadCloud className="size-7 text-muted-foreground" />

            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drop files here, or{" "}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="text-xs text-muted-foreground">
                Up to {maxUploadMb}MB per file.
              </p>
            </div>

            <input
              ref={inputRef}
              type="file"
              name="files"
              multiple
              className="sr-only"
              onChange={(event) => adopt(event.target.files)}
            />

            {names.length > 0 ? (
              <p className="max-w-full truncate text-xs text-foreground">
                {names.length === 1
                  ? names[0]
                  : `${names.length} files selected`}
              </p>
            ) : null}

            {errors.files?.[0] ? (
              <p className="text-xs text-destructive">{errors.files[0]}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="upload-folder"
              label="Folder"
              hint="Optional. Groups files in the library; it does not change their URLs."
              error={errors.folder?.[0]}
            >
              {(props) => (
                <>
                  <Input
                    {...props}
                    name="folder"
                    list="media-folders"
                    placeholder="tours"
                  />
                  <datalist id="media-folders">
                    {folders.map((folder) => (
                      <option key={folder} value={folder} />
                    ))}
                  </datalist>
                </>
              )}
            </Field>

            <Field
              id="upload-alt"
              label="Alt text"
              hint="Used when a single file is uploaded. Describes the image for screen readers and search engines."
              error={errors.altText?.[0]}
            >
              {(props) => (
                <Input
                  {...props}
                  name="altText"
                  placeholder="Trekkers on the Annapurna trail"
                />
              )}
            </Field>
          </div>

          <Button type="submit" size="sm" disabled={pending}>
            <UploadCloud className="size-4" />
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
