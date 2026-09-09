"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { saveRedirectAction } from "@/app/admin/(dashboard)/redirects/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CheckboxField, Field, Input } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";

export function RedirectForm() {
  const [state, formAction, pending] = useActionState(saveRedirectAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) {
      if (state.message) toast.error(state.message);
      return;
    }
    toast.success(state.message ?? "Redirect created.");
    formRef.current?.reset();
    router.refresh();
  }, [state, router]);

  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader title="Add a redirect" />
      <CardBody>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="source"
              label="From"
              error={errors.source?.[0]}
              hint="The old path on this site."
              required
            >
              {(props) => (
                <Input
                  {...props}
                  name="source"
                  placeholder="/old-trek-page"
                  className="font-mono text-xs"
                  required
                />
              )}
            </Field>

            <Field
              id="destination"
              label="To"
              error={errors.destination?.[0]}
              hint="A path on this site, or a full URL elsewhere."
              required
            >
              {(props) => (
                <Input
                  {...props}
                  name="destination"
                  placeholder="/tours/annapurna-base-camp"
                  className="font-mono text-xs"
                  required
                />
              )}
            </Field>
          </div>

          <div className="flex flex-wrap gap-6">
            <CheckboxField
              id="permanent"
              name="permanent"
              label="Permanent (308)"
              hint="Tells search engines the move is final. Use temporary for a short campaign."
              defaultChecked
            />
            <CheckboxField
              id="enabled"
              name="enabled"
              label="Active"
              defaultChecked
            />
          </div>

          <Button type="submit" size="sm" disabled={pending}>
            <Plus className="size-4" />
            {pending ? "Adding…" : "Add redirect"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
