"use client";

import { Check, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  deleteMediaAction,
  updateMediaAction,
} from "@/app/admin/(dashboard)/media/actions";
import { MediaThumb } from "@/components/cms/media-thumb";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import { formatBytes, formatDate } from "@/lib/utils";
import type { MediaItem } from "@/types/content";

/**
 * The library grid.
 *
 * Selecting a tile opens its details: the metadata form, the URL to paste into
 * a field, and deletion. Everything a client needs for one file is in the one
 * dialog, so there is no separate detail route to navigate to and back from.
 */
export function MediaGrid({
  items,
  folders,
  canUpdate,
  canDelete,
}: {
  items: MediaItem[];
  folders: string[];
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === openId) ?? null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => setOpenId(item.id)}
              className="group w-full overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary"
            >
              <div className="aspect-square overflow-hidden">
                <MediaThumb
                  url={item.url}
                  kind={item.kind}
                  alt={item.altText ?? item.filename}
                />
              </div>

              <div className="space-y-0.5 px-2.5 py-2">
                <p className="truncate text-xs font-medium" title={item.filename}>
                  {item.filename}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(item.size)}
                  {item.folder ? ` · ${item.folder}` : ""}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      >
        {selected ? (
          <MediaDetails
            item={selected}
            folders={folders}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onClose={() => setOpenId(null)}
          />
        ) : null}
      </Dialog>
    </>
  );
}

function MediaDetails({
  item,
  folders,
  canUpdate,
  canDelete,
  onClose,
}: {
  item: MediaItem;
  folders: string[];
  canUpdate: boolean;
  canDelete: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateMediaAction, IDLE);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) {
      if (state.message) toast.error(state.message);
      return;
    }
    toast.success(state.message ?? "Details saved.");
    router.refresh();
  }, [state, router]);

  const errors = state.fieldErrors ?? {};

  return (
    <DialogContent
      title={item.filename}
      description={`${formatBytes(item.size)} · ${item.mimeType} · added ${formatDate(item.createdAt)}`}
      className="max-w-lg"
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="aspect-video">
            <MediaThumb
              url={item.url}
              kind={item.kind}
              alt={item.altText ?? item.filename}
              className="object-contain"
            />
          </div>
        </div>

        <UrlRow url={item.url} />

        <form
          action={formAction}
          className="space-y-4"
          key={item.id}
          id="media-details-form"
        >
          <input type="hidden" name="id" value={item.id} />

          <Field
            id="media-altText"
            label="Alt text"
            error={errors.altText?.[0]}
            hint="What the image shows, for screen readers and search engines. Leave empty for decorative images."
          >
            {(props) => (
              <Input
                {...props}
                name="altText"
                defaultValue={item.altText ?? ""}
                disabled={!canUpdate}
              />
            )}
          </Field>

          <Field id="media-caption" label="Caption" error={errors.caption?.[0]}>
            {(props) => (
              <Input
                {...props}
                name="caption"
                defaultValue={item.caption ?? ""}
                disabled={!canUpdate}
              />
            )}
          </Field>

          <Field
            id="media-description"
            label="Description"
            error={errors.description?.[0]}
            hint="Internal note. Never rendered on the site."
          >
            {(props) => (
              <Textarea
                {...props}
                name="description"
                defaultValue={item.description ?? ""}
                rows={2}
                disabled={!canUpdate}
              />
            )}
          </Field>

          <Field
            id="media-folder"
            label="Folder"
            error={errors.folder?.[0]}
            hint="Moving a file between folders does not change its URL."
          >
            {(props) => (
              <>
                <Input
                  {...props}
                  name="folder"
                  defaultValue={item.folder ?? ""}
                  list="media-detail-folders"
                  disabled={!canUpdate}
                />
                <datalist id="media-detail-folders">
                  {folders.map((folder) => (
                    <option key={folder} value={folder} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </form>
      </div>

      <DialogFooter className="justify-between">
        <div className="flex items-center gap-2">
          {canDelete ? (
            <ConfirmButton
              variant="ghost"
              size="sm"
              title="Delete this file?"
              description="It is removed from storage immediately. Any page still pointing at its URL will show a broken image — the CMS cannot tell which pages those are."
              confirmLabel="Delete"
              successMessage="File deleted."
              action={async () => {
                const result = await deleteMediaAction(item.id);
                if (!result.ok) return { error: result.message };
                onClose();
                router.refresh();
                return undefined;
              }}
            >
              <Trash2 className="size-4 text-destructive" />
              <span className="sr-only">Delete {item.filename}</span>
            </ConfirmButton>
          ) : null}

          <Button variant="ghost" size="sm" asChild>
            <a href={item.url} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" />
              Open
            </a>
          </Button>
        </div>

        {canUpdate ? (
          <Button
            type="submit"
            form="media-details-form"
            size="sm"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save details"}
          </Button>
        ) : null}
      </DialogFooter>
    </DialogContent>
  );
}

/** The field a client actually came for: the URL, and one click to copy it. */
function UrlRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard access can be refused (insecure origin, permissions). The
      // input is selectable, so there is still a way to copy by hand.
      toast.error("Could not copy. Select the address and copy it manually.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input readOnly value={url} className="font-mono text-xs" aria-label="File URL" />
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
