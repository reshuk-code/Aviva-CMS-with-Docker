"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteRedirectAction } from "@/app/admin/(dashboard)/redirects/actions";
import { ConfirmButton } from "@/components/ui/confirm-button";

export function DeleteRedirectButton({
  id,
  source,
}: {
  id: string;
  source: string;
}) {
  const router = useRouter();

  return (
    <ConfirmButton
      variant="ghost"
      size="sm"
      title="Delete this redirect?"
      description={`Requests to ${source} will 404 again unless another rule or page covers them.`}
      confirmLabel="Delete"
      successMessage="Redirect deleted."
      action={async () => {
        const result = await deleteRedirectAction(id);
        router.refresh();
        return result.ok ? undefined : { error: result.message };
      }}
    >
      <Trash2 className="size-4 text-destructive" />
      <span className="sr-only">Delete redirect from {source}</span>
    </ConfirmButton>
  );
}
