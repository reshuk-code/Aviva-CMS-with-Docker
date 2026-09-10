"use client";

import { AlertCircle, Save } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { triageEnquiryAction } from "@/app/admin/(dashboard)/enquiries/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import { ENQUIRY_STATUSES, type Enquiry } from "@/types/content";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  converted: "Converted",
  closed: "Closed",
  spam: "Spam",
};

/**
 * Triage panel for one enquiry.
 *
 * Only the two fields the company owns. The traveller's name, message and
 * contact details are rendered as read-only text beside this, because an
 * enquiry is evidence of what somebody sent and an editable copy is not.
 */
export function EnquiryTriageForm({
  enquiry,
  canUpdate,
}: {
  enquiry: Enquiry;
  canUpdate: boolean;
}) {
  const [state, formAction, pending] = useActionState(triageEnquiryAction, IDLE);

  const errors = state.fieldErrors ?? {};

  /**
   * Submitting by hand rather than through `<form action=...>`: React resets
   * such a form once the action completes, which would throw away notes typed
   * before a rejected save. See docs/ARCHITECTURE.md.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="id" value={enquiry.id} />

      <Card>
        <CardHeader
          title="Triage"
          description="Where this enquiry has got to, and what your team needs to know."
        />
        <CardBody className="space-y-4">
          {state.message && !state.ok ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {state.message}
            </p>
          ) : null}

          <Field id="status" label="State" error={errors.status?.[0]}>
            {(props) => (
              <Select
                {...props}
                name="status"
                defaultValue={enquiry.status}
                disabled={!canUpdate}
              >
                {ENQUIRY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            id="notes"
            label="Internal notes"
            error={errors.notes?.[0]}
            hint="Never shown to the customer. Quoted price, who is handling it, what was promised."
          >
            {(props) => (
              <Textarea
                {...props}
                name="notes"
                defaultValue={enquiry.notes ?? ""}
                rows={7}
                disabled={!canUpdate}
                placeholder="Quoted $2,150 pp on 12 Sept. Waiting on their dates."
              />
            )}
          </Field>

          {canUpdate ? (
            <Button type="submit" disabled={pending} className="w-full">
              <Save className="size-4" />
              {pending ? "Saving…" : "Save triage"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Your role can read enquiries but not triage them.
            </p>
          )}
        </CardBody>
      </Card>
    </form>
  );
}
