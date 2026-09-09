"use client";

import { ArrowRight, Copy, PlugZap, Play } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  applySchemaAction,
  copyDataAction,
  readSchemaAction,
  testConnectionAction,
} from "@/app/admin/(dashboard)/settings/connections/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { IDLE, type ActionState } from "@/lib/actions/result";

interface ProviderOption {
  id: string;
  label: string;
  isActive: boolean;
  configured: boolean;
}

/**
 * One-off setup tasks, run on the developer's machine.
 *
 * These are deliberately development-only. Applying a schema or copying
 * records is something you do once while wiring a project up; doing it against
 * a live site is how production data gets overwritten. The server actions
 * refuse to run when NODE_ENV is production — this is not just a hidden panel.
 */
export function SetupTools({
  activeLabel,
  providers,
  enabled,
  isDevelopment,
}: {
  activeLabel: string;
  providers: ProviderOption[];
  enabled: boolean;
  isDevelopment: boolean;
}) {
  const configured = providers.filter((p) => p.configured);
  const targets = configured.filter((p) => !p.isActive);

  const [schemaTarget, setSchemaTarget] = useState(
    providers.find((p) => p.isActive && p.id !== "local")?.id ??
      configured.find((p) => p.id !== "local")?.id ??
      "supabase",
  );
  const [copyTarget, setCopyTarget] = useState(targets[0]?.id ?? "");
  const [sql, setSql] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();

  const [schemaState, applySchema, applying] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await applySchemaAction(previous, formData);
      if (result.ok) toast.success(result.message ?? "Done.");
      else if (result.message) toast.error(result.message);
      return result;
    },
    IDLE,
  );

  const [copyState, runCopy, copying] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await copyDataAction(previous, formData);
      if (result.ok) toast.success(result.message ?? "Done.");
      else if (result.message) toast.error(result.message);
      return result;
    },
    IDLE,
  );

  function test(provider: string) {
    startBusy(async () => {
      const result = await testConnectionAction(provider);
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function showSql(provider: string) {
    startBusy(async () => {
      const result = await readSchemaAction(provider);
      if (result.ok) setSql(result.sql);
      else {
        setSql(null);
        toast.error(result.message);
      }
    });
  }

  if (!isDevelopment) {
    return (
      <Card>
        <CardHeader
          title="Setup tools"
          description="Applying a schema and copying data run only in development. Prepare your backend locally, then deploy."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Setup tools"
        description="Development only — these refuse to run on a production server."
      />

      <CardBody className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Check a connection</p>
          <div className="flex flex-wrap gap-2">
            {configured.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                size="sm"
                onClick={() => test(provider.id)}
                disabled={busy}
              >
                <PlugZap className="size-4" />
                {provider.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Opens a real connection using your .env.local values and reports
            what came back.
          </p>
        </div>

        <div className="space-y-2 border-t border-border pt-5">
          <p className="text-sm font-medium">Create the CMS tables</p>

          <form action={applySchema} className="flex flex-wrap items-end gap-2">
            <Field id="schema-provider" label="Provider" className="min-w-44">
              {(props) => (
                <Select
                  {...props}
                  name="provider"
                  value={schemaTarget}
                  onChange={(event) => {
                    setSchemaTarget(event.target.value);
                    setSql(null);
                  }}
                >
                  {providers
                    .filter((provider) => provider.id !== "local")
                    .map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                </Select>
              )}
            </Field>

            <Button
              type="button"
              variant="outline"
              onClick={() => showSql(schemaTarget)}
              disabled={busy}
            >
              Show SQL
            </Button>

            {schemaTarget === "neon" ? (
              <Button type="submit" disabled={applying || !enabled}>
                <Play className="size-4" />
                {applying ? "Running…" : "Run it"}
              </Button>
            ) : null}
          </form>

          <p className="text-xs text-muted-foreground">
            {schemaTarget === "neon"
              ? "Neon can be set up from here, because its driver speaks SQL."
              : "Supabase's API cannot run DDL, so copy the SQL into that project's SQL editor."}
          </p>

          {schemaState.message && !schemaState.ok ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {schemaState.message}
            </p>
          ) : null}

          {sql ? (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard
                    .writeText(sql)
                    .then(() => toast.success("SQL copied."))
                    .catch(() => toast.error("Could not copy to the clipboard."));
                }}
              >
                <Copy className="size-4" />
                Copy SQL
              </Button>
              <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed">
                {sql}
              </pre>
            </div>
          ) : null}
        </div>

        {targets.length > 0 ? (
          <div className="space-y-2 border-t border-border pt-5">
            <p className="text-sm font-medium">Copy content to another backend</p>

            <form action={runCopy} className="flex flex-wrap items-end gap-2">
              <div className="min-w-32">
                <p className="mb-1.5 text-sm font-medium">From</p>
                <p className="flex h-9 items-center rounded-md border border-border bg-muted/50 px-3 text-sm">
                  {activeLabel}
                </p>
              </div>

              <ArrowRight className="mb-2 size-4 shrink-0 text-muted-foreground" />

              <Field id="copy-target" label="To" className="min-w-44">
                {(props) => (
                  <Select
                    {...props}
                    name="target"
                    value={copyTarget}
                    onChange={(event) => setCopyTarget(event.target.value)}
                  >
                    {targets.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Button type="submit" disabled={copying || !enabled}>
                {copying ? "Copying…" : "Copy content"}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground">
              Copies records and site settings, keeping their ids, so running it
              twice is safe. Nothing is deleted from {activeLabel}. Media files
              are not copied. Afterwards, switch over by setting CMS_DATABASE in
              .env.local.
            </p>

            {copyState.message && !copyState.ok ? (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {copyState.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {!enabled ? (
          <p className="text-sm text-muted-foreground">
            Your role can view connections but not run these tools.
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
