import Link from "next/link";
import { AlertTriangle, Code2 } from "lucide-react";

import { PageHeader } from "@/components/cms/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { getCmsConfig, getEnabledModules } from "@/lib/cms/config";
import { DEFAULT_MODULES } from "@/lib/cms/define-config";
import { buildRouteInventory, ROUTE_OWNER_LABELS } from "@/lib/cms/routes";
import { pages } from "@/lib/cms/repositories/pages";
import developerRoutes from "@/config/routes";

export const metadata = { title: "Developer" };

export const dynamic = "force-dynamic";

/**
 * Developer settings: route ownership and module state.
 *
 * The route inventory is the answer to §6 — it makes it obvious who owns each
 * URL, and warns when a CMS page will never render because a hand-written
 * route already claims its path.
 */
export default async function DeveloperPage() {
  await requirePermission("developer.read");

  const config = getCmsConfig();
  const summaries = await pages.summaries();
  const enabled = new Set(getEnabledModules());

  const inventory = buildRouteInventory(developerRoutes, summaries);

  const shadowed = inventory.filter((entry) => entry.shadowed);

  return (
    <>
      <PageHeader
        title="Developer"
        description="How this project is wired together. Read-only: everything here comes from cms.config.ts and config/routes.ts."
      />

      <div className="space-y-5">
        {shadowed.length > 0 ? (
          <p className="flex items-start gap-2 rounded-md border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] px-3 py-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
            <span>
              {shadowed.length} CMS page
              {shadowed.length === 1 ? "" : "s"} will never render because a
              hand-written route already serves that path:{" "}
              {shadowed.map((entry) => entry.path).join(", ")}. Either change the
              page slug, or let the coded route read its content from the CMS.
            </span>
          </p>
        ) : null}

        <Card>
          <CardHeader
            title="Routes"
            description="Hand-written routes always win over CMS pages — that is how the Next.js router resolves a catch-all."
          />
          <Table>
            <THead>
              <tr>
                <TH>Path</TH>
                <TH>Owner</TH>
                <TH className="hidden sm:table-cell">CMS metadata</TH>
                <TH className="hidden md:table-cell">Notes</TH>
              </tr>
            </THead>
            <TBody>
              {inventory.map((entry) => (
                <TR key={`${entry.owner}-${entry.path}`}>
                  <TD>
                    <code className="text-xs">{entry.path}</code>
                    {entry.shadowed ? (
                      <Badge tone="warning" className="ml-2">
                        Shadowed
                      </Badge>
                    ) : null}
                  </TD>
                  <TD>
                    <Badge
                      tone={
                        entry.owner === "developer"
                          ? "info"
                          : entry.owner === "cms"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {ROUTE_OWNER_LABELS[entry.owner]}
                    </Badge>
                  </TD>
                  <TD className="hidden text-xs text-muted-foreground sm:table-cell">
                    {entry.cmsMetadata ? "Enabled" : "—"}
                  </TD>
                  <TD className="hidden text-xs text-muted-foreground md:table-cell">
                    {entry.description ??
                      (entry.owner === "cms" ? `Status: ${entry.status}` : "—")}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <CardBody className="border-t border-border text-xs text-muted-foreground">
            Declare hand-written routes in{" "}
            <code className="rounded bg-muted px-1">config/routes.ts</code>. Run{" "}
            <code className="rounded bg-muted px-1">npm run cms:routes</code> to
            list routes in <code className="rounded bg-muted px-1">app/</code>{" "}
            that are not declared yet.
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Modules"
            description="Switch these in cms.config.ts. A disabled module disappears from the sidebar."
          />
          <CardBody className="flex flex-wrap gap-2">
            {(Object.keys(DEFAULT_MODULES) as (keyof typeof DEFAULT_MODULES)[]).map(
              (module) => (
                <Badge key={module} tone={enabled.has(module) ? "success" : "neutral"}>
                  {module}
                  {enabled.has(module) ? "" : " (off)"}
                </Badge>
              ),
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="SDK" description="What your frontend code can call today." />
          <CardBody className="space-y-3">
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
              {`import { cms } from "@/lib/cms";

const page  = await cms.pages.getBySlug("/about");
const all   = await cms.pages.getPublished();
const menu  = await cms.navigation.get("main");
const site  = await cms.settings.get();
const rule  = await cms.redirects.match("/old-url");
const files = await cms.media.list({ kind: "image" });
const posts = await cms.posts.getPublished({ perPage: 10 });
const places = await cms.destinations.getFeatured(6);
const trips  = await cms.tours.getByDestination(places[0].id);`}
            </pre>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Code2 className="size-3.5" />
              Activities and testimonials join the SDK in Phase 2 — see{" "}
              <Link
                href="/admin/database"
                className="text-primary underline-offset-2 hover:underline"
              >
                Database
              </Link>{" "}
              for what is stored now.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Configuration" />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {(
                [
                  ["Site name", config.siteName],
                  ["Site URL", config.siteUrl],
                  ["Database", config.database],
                  ["Storage", config.storage],
                  ["Admin path", config.admin.basePath],
                  ["CMS catch-all routes", config.frontend.catchAllRoutes ? "on" : "off"],
                  ["Sitemap", config.frontend.sitemap ? "on" : "off"],
                  ["Default locale", config.defaultLocale],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-border pb-2"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="truncate font-mono text-xs">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
