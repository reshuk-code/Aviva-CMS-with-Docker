"use client";

import { KeyRound } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { changeOwnPasswordAction } from "@/app/admin/(dashboard)/users/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(
    changeOwnPasswordAction,
    IDLE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!state.ok) {
      if (state.message) toast.error(state.message);
      return;
    }
    toast.success(state.message ?? "Password changed.");
    formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction}>
      <Card>
        <CardHeader title="Change your password" />

        <CardBody className="space-y-4">
          <Field
            id="currentPassword"
            label="Current password"
            error={errors.currentPassword?.[0]}
            required
          >
            {(props) => (
              <Input
                {...props}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            )}
          </Field>

          <Field
            id="newPassword"
            label="New password"
            error={errors.newPassword?.[0]}
            hint="At least 10 characters."
            required
          >
            {(props) => (
              <Input
                {...props}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            )}
          </Field>

          <Field
            id="confirmPassword"
            label="Confirm new password"
            error={errors.confirmPassword?.[0]}
            required
          >
            {(props) => (
              <Input
                {...props}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
              />
            )}
          </Field>
        </CardBody>

        <CardFooter>
          <Button type="submit" size="sm" disabled={pending}>
            <KeyRound className="size-4" />
            {pending ? "Saving…" : "Change password"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
