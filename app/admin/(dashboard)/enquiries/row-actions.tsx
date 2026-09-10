"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Ban, Check, Mail, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  deleteEnquiryAction,
  setEnquiryStatusAction,
} from "@/app/admin/(dashboard)/enquiries/actions";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ENQUIRY_STATUSES, type EnquiryStatus } from "@/types/content";

const itemClass =
  "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted";

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  converted: "Converted",
  closed: "Closed",
  spam: "Spam",
};

/**
 * Row actions for an enquiry: triage and delete.
 *
 * There is no edit action. An enquiry is a record of what somebody actually
 * sent, so the inbox files it rather than rewriting it.
 */
export function EnquiryRowActions({
  enquiry,
  canUpdate,
  canDelete,
}: {
  enquiry: { id: string; name: string; status: EnquiryStatus };
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(status: EnquiryStatus) {
    startTransition(async () => {
      const result = await setEnquiryStatusAction(enquiry.id, status);
      if (result.ok) toast.success(result.message ?? "Done.");
      else toast.error(result.message ?? "That did not work.");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/enquiries/${enquiry.id}`}>
          <Mail className="size-4" />
          <span className="sr-only">Open the enquiry from {enquiry.name}</span>
        </Link>
      </Button>

      {canUpdate ? (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="sm" disabled={pending}>
              <MoreHorizontal className="size-4" />
              <span className="sr-only">More actions for {enquiry.name}</span>
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-48 rounded-md border border-border bg-card p-1 shadow-lg"
            >
              {ENQUIRY_STATUSES.filter(
                (status) => status !== enquiry.status && status !== "spam",
              ).map((status) => (
                <DropdownMenu.Item
                  key={status}
                  className={itemClass}
                  onSelect={() => setStatus(status)}
                >
                  <Check className="size-4" />
                  Mark {STATUS_LABELS[status].toLowerCase()}
                </DropdownMenu.Item>
              ))}

              {enquiry.status !== "spam" ? (
                <DropdownMenu.Item
                  className={`${itemClass} text-destructive`}
                  onSelect={() => setStatus("spam")}
                >
                  <Ban className="size-4" />
                  Mark as spam
                </DropdownMenu.Item>
              ) : null}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      ) : null}

      {canDelete ? (
        <ConfirmButton
          variant="ghost"
          size="sm"
          title={`Delete the enquiry from "${enquiry.name}"?`}
          description="This erases what they sent you, including their contact details. If you only want it out of the way, mark it closed or spam instead. This cannot be undone."
          confirmLabel="Delete permanently"
          successMessage="Enquiry deleted."
          action={async () => {
            const result = await deleteEnquiryAction(enquiry.id);
            router.refresh();
            return result.ok ? undefined : { error: result.message };
          }}
        >
          <Trash2 className="size-4 text-destructive" />
          <span className="sr-only">
            Delete the enquiry from {enquiry.name} permanently
          </span>
        </ConfirmButton>
      ) : null}
    </div>
  );
}
