import { Check, Info, Minus } from "lucide-react";

import { SetupTools } from "@/app/admin/(dashboard)/settings/connections/setup-tools";
import { PageHeader } from "@/components/cms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getConnectionStatus,
  STATE_LABELS,
  type ConnectionState,
} from "@/lib/connections/status";

export const metadata = { title: "Connections" };

// Reads the environment on every request, so it must never be prerendered.
export const dynamic = "force-dynamic";

const SECTION_TITLES: Record<string, { title: string; description: string }> = {
  database: {
    title: "Database",
    description: "Where pages, menus, settings and users are stored.",
  },
  storage: {
    title: "Media storage",
    description: "Where uploaded images and files live.",
  },
  auth: {
    title: "Sign in",
    description:
      "Who verifies passwords. Roles always stay in this CMS — the provider says who someone is, the CMS decides what they may do.",
  },
};

const STATE_TONE: Record<
  ConnectionState,
  "success" | "warning" | "info" | "neutral"
> = {
  connected: "success",
  incomplete: "warning",
  ready: "info",
  not_configured: "neutral",
  unavailable: "neutral",
};

/**
 * Connections — read only.
 *
 * Credentials live in `.env.local` and nowhere else. This screen detects what
 * is set and reports it, so there is exactly one place to look when something
 * is wrong, and no way to break a live site by clicking here.
 */
export default async function ConnectionsPage() {
  const session = await requirePermission("database.read");
  const sections = getConnectionStatus();

  const isDevelopment = process.env.NODE_ENV !== "production";
  const canRunTools =
    isDevelopment && hasPermission({ role: session.role }, "database.update");

  const database = sections[0];

  return (
    <>
      <PageHeader
        title="Connections"
        description="Which backend this project is using, and what still needs setting up."
        breadcrumbs={[
          { label: "Site settings", href: "/admin/settings" },
          { label: "Connections" },
        ]}
      />

      <div className="space-y-8">
        <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span>
            Everything here is configured in{" "}
            <code className="rounded bg-muted px-1">.env.local</code> — add the
            variables, restart the dev server, and this page updates. Nothing on
            it can be edited, so a live site cannot be re-pointed by accident.
          </span>
        </p>

        {sections.map((section) => (
          <section key={section.kind} className="space-y-3">
            <div>
              <h2 className="text-base font-semibold">
                {SECTION_TITLES[section.kind].title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {SECTION_TITLES[section.kind].description} Using{" "}
                <strong>{section.activeLabel}</strong>
                {section.fromEnv ? null : (
                  <>
                    {" "}
                    — set{" "}
                    <code className="rounded bg-muted px-1">
                      {section.envVar}
                    </code>{" "}
                    to change it
                  </>
                )}
                .
              </p>
            </div>

            {section.providers.map((provider) => (
              <Card
                key={provider.definition.id}
                className={provider.isActive ? "border-primary/50" : undefined}
              >
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {provider.definition.label}
                      {provider.isActive ? (
                        <Badge tone="success">In use</Badge>
                      ) : null}
                      <Badge tone={STATE_TONE[provider.state]}>
                        {STATE_LABELS[provider.state]}
                      </Badge>
                      {provider.definition.status === "unverified" ? (
                        <Badge tone="warning">Untested</Badge>
                      ) : null}
                    </span>
                  }
                  description={provider.definition.description}
                />

                {provider.fields.length > 0 ||
                provider.definition.setup?.length ? (
                  <CardBody className="space-y-4">
                    {provider.fields.length > 0 ? (
                      <ul className="space-y-1.5">
                        {provider.fields.map((field) => (
                          <li
                            key={field.envVar}
                            className="flex flex-wrap items-center gap-2 text-sm"
                          >
                            {field.isSet ? (
                              <Check className="size-4 shrink-0 text-[var(--success)]" />
                            ) : (
                              <Minus
                                className={
                                  field.required
                                    ? "size-4 shrink-0 text-[var(--warning)]"
                                    : "size-4 shrink-0 text-muted-foreground/50"
                                }
                              />
                            )}
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {field.envVar}
                            </code>
                            <span className="text-muted-foreground">
                              {field.label}
                              {field.required ? "" : " (optional)"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {provider.state === "incomplete" ? (
                      <p className="rounded-md border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] px-3 py-2 text-sm">
                        This provider is selected but{" "}
                        {provider.missing.join(", ")}{" "}
                        {provider.missing.length === 1 ? "is" : "are"} missing
                        from{" "}
                        <code className="rounded bg-muted px-1">.env.local</code>.
                      </p>
                    ) : null}

                    {provider.definition.setup?.length ? (
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Setup
                        </p>
                        <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
                          {provider.definition.setup.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}

                    {provider.definition.docsUrl ? (
                      <a
                        href={provider.definition.docsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-sm text-primary underline-offset-2 hover:underline"
                      >
                        Open the {provider.definition.label} dashboard
                      </a>
                    ) : null}
                  </CardBody>
                ) : null}
              </Card>
            ))}
          </section>
        ))}

        <SetupTools
          activeLabel={database.activeLabel}
          providers={database.providers
            .filter((provider) => provider.definition.status !== "unavailable")
            .map((provider) => ({
              id: provider.definition.id,
              label: provider.definition.label,
              isActive: provider.isActive,
              configured: provider.missing.length === 0,
            }))}
          enabled={canRunTools}
          isDevelopment={isDevelopment}
        />
      </div>
    </>
  );
}
