"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { createUserAction } from "@/app/admin/(dashboard)/users/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/auth/permissions";
import { ROLES } from "@/types/user";

export function CreateUserForm({
  canAssignSuperAdmin,
}: {
  canAssignSuperAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState(createUserAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (!state.ok) {
      if (state.message) toast.error(state.message);
      return;
    }
    toast.success(state.message ?? "User created.");
    formRef.current?.reset();
    router.refresh();
  }, [state, router]);

  return (
    <Card>
      <CardHeader
        title="Add someone to the team"
        description="They sign in with this email address and password."
      />
      <CardBody>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="active" value="on" />
          <input type="hidden" name="avatar" value="" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="new-name" label="Name" error={errors.name?.[0]} required>
              {(props) => (
                <Input {...props} name="name" autoComplete="off" required />
              )}
            </Field>

            <Field id="new-email" label="Email address" error={errors.email?.[0]} required>
              {(props) => (
                <Input
                  {...props}
                  name="email"
                  type="email"
                  autoComplete="off"
                  required
                />
              )}
            </Field>

            <Field
              id="new-password"
              label="Temporary password"
              error={errors.password?.[0]}
              hint="At least 10 characters. Ask them to change it after signing in."
              required
            >
              {(props) => (
                <Input
                  {...props}
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                />
              )}
            </Field>

            <Field
              id="new-role"
              label="Role"
              error={errors.role?.[0]}
              hint={ROLE_DESCRIPTIONS.editor}
            >
              {(props) => (
                <Select {...props} name="role" defaultValue="editor">
                  {ROLES.filter(
                    (role) => canAssignSuperAdmin || role !== "super_admin",
                  ).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Button type="submit" size="sm" disabled={pending}>
            <UserPlus className="size-4" />
            {pending ? "Creating…" : "Create user"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
