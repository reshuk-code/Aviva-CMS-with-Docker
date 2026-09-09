"use client";

import { AlertCircle, Database } from "lucide-react";
import { useActionState } from "react";

import { setupAction } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import { cn } from "@/lib/utils";

export function SetupForm({
  defaultSiteName,
  provider,
  providerMessage,
  providerOk,
}: {
  defaultSiteName: string;
  provider: string;
  providerMessage: string;
  providerOk: boolean;
}) {
  const [state, formAction, pending] = useActionState(setupAction, IDLE);
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <CardBody className="space-y-4">
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
            providerOk
              ? "border-border bg-muted/50 text-muted-foreground"
              : "border-destructive/40 bg-destructive/10 text-destructive",
          )}
        >
          <Database className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <strong className="font-medium capitalize">{provider}</strong>{" "}
            adapter — {providerMessage}
          </span>
        </div>

        <form action={formAction} className="space-y-4">
          {state.message && !state.ok ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {state.message}
            </p>
          ) : null}

          <Field id="siteName" label="Website name" error={errors.siteName?.[0]} required>
            {(props) => (
              <Input {...props} name="siteName" defaultValue={defaultSiteName} required />
            )}
          </Field>

          <Field id="name" label="Your name" error={errors.name?.[0]} required>
            {(props) => <Input {...props} name="name" autoComplete="name" required />}
          </Field>

          <Field id="email" label="Email address" error={errors.email?.[0]} required>
            {(props) => (
              <Input
                {...props}
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            )}
          </Field>

          <Field
            id="password"
            label="Password"
            error={errors.password?.[0]}
            hint="At least 10 characters."
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
            id="confirmPassword"
            label="Confirm password"
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

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
