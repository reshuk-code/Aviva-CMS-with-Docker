"use client";

import { AlertCircle } from "lucide-react";
import { useActionState } from "react";

import { signInAction } from "@/app/admin/auth-actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, IDLE);

  return (
    <Card>
      <CardBody>
        <form action={formAction} className="space-y-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}

          {state.message && !state.ok ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {state.message}
            </p>
          ) : null}

          <Field id="email" label="Email address" required>
            {(props) => (
              <Input
                {...props}
                name="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
              />
            )}
          </Field>

          <Field id="password" label="Password" required>
            {(props) => (
              <Input
                {...props}
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            )}
          </Field>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
