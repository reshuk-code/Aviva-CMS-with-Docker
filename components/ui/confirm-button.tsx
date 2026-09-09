"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A button that asks before doing something destructive, then runs a server
 * action. Used for delete/trash across the admin (§22: confirmation dialogs).
 */
export function ConfirmButton({
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  action,
  children,
  successMessage,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "action"> & {
  title: string;
  description: string;
  confirmLabel?: string;
  confirmVariant?: ButtonProps["variant"];
  successMessage?: string;
  /** Server action. Returns an error message, or nothing on success. */
  action: () => Promise<{ error?: string } | void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await action();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      if (successMessage) toast.success(successMessage);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </DialogTrigger>

      <DialogContent title={title} description={description}>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={run}
            disabled={pending}
          >
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
