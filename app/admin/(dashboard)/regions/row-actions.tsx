"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Copy, MoreHorizontal, PencilLine, Send, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteRegionAction,
  duplicateRegionAction,
  setRegionStatusAction,
} from "@/app/admin/(dashboard)/regions/actions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import type { ContentStatus } from "@/types/common";

const itemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted";

/**
 * Row actions for a region. No View/Preview entry, for the same reason as
 * destinations: the CMS does not know which route the project serves them at.
 */
export function RegionRowActions({
  region,
  canUpdate,
  canDelete,
  canPublish,
  canCreate,
}: {
  region: { id: string; name: string; status: ContentStatus };
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(result.message ?? "Done.");
      else toast.error(result.message ?? "That did not work.");
      router.refresh();
    });
  }

  function setStatus(status: ContentStatus) {
    run(() => setRegionStatusAction(region.id, status));
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canUpdate ? (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/regions/${region.id}`}>
            <PencilLine className="size-4" />
            <span className="sr-only">Edit {region.name}</span>
          </Link>
        </Button>
      ) : null}

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="ghost" size="sm" disabled={pending}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">More actions for {region.name}</span>
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 min-w-48 rounded-md border border-border bg-card p-1 shadow-lg"
          >
            {canPublish && region.status !== "published" ? (
              <DropdownMenu.Item className={itemClass} onSelect={() => setStatus("published")}>
                <Send className="size-4" />
                Publish
              </DropdownMenu.Item>
            ) : null}

            {canPublish && region.status === "published" ? (
              <DropdownMenu.Item className={itemClass} onSelect={() => setStatus("draft")}>
                <Undo2 className="size-4" />
                Switch to draft
              </DropdownMenu.Item>
            ) : null}

            {canDelete && region.status === "trash" ? (
              <DropdownMenu.Item className={itemClass} onSelect={() => setStatus("draft")}>
                <Undo2 className="size-4" />
                Restore from trash
              </DropdownMenu.Item>
            ) : null}

            {canCreate ? (
              <DropdownMenu.Item
                className={itemClass}
                onSelect={() => run(() => duplicateRegionAction(region.id))}
              >
                <Copy className="size-4" />
                Duplicate
              </DropdownMenu.Item>
            ) : null}

            {canDelete && region.status !== "trash" ? (
              <DropdownMenu.Item
                className={`${itemClass} text-destructive`}
                onSelect={() => setStatus("trash")}
              >
                <Trash2 className="size-4" />
                Move to trash
              </DropdownMenu.Item>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {canDelete && region.status === "trash" ? (
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={`Delete "${region.name}"?`}
          description="This removes the region permanently. Destinations keep their own region text, which is separate. This cannot be undone."
          confirmLabel="Delete permanently"
          successMessage="Region deleted."
          action={async () => {
            const result = await deleteRegionAction(region.id);
            router.refresh();
            return result.ok ? undefined : { error: result.message };
          }}
        >
          <Trash2 className="size-4 text-destructive" />
          <span className="sr-only">Delete {region.name} permanently</span>
        </ConfirmButton>
      ) : null}
    </div>
  );
}
