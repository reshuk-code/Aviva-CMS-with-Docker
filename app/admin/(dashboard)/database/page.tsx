import Link from "next/link";
import { AlertTriangle, CheckCircle2, Share2, XCircle } from "lucide-react";

import { PageHeader } from "@/components/cms/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { getCmsConfig } from "@/lib/cms/config";
import { COLLECTIONS } from "@/lib/database/adapter";
import { getDatabase } from "@/lib/database";

export const metadata = { title: "Database" };

// Connection state must be checked on request, never baked in at build time.
export const dynamic = "force-dynamic";

/**
 * Database status.
 *
 * Shows which adapter is live, whether it is reachable, and how many records
 * each collection holds. No credentials are ever displayed.
 */
export default async function DatabasePage() {
  await requirePermission("database.read");

  const config = getCmsConfig();
  const adapter = await getDatabase();
  const health = await adapter.health();

  const counts = await Promise.all(
    COLLECTIONS.map(async (name) => {
      try {
        return { name, count: await adapter.collection(name).count() };
      } catch (error) {
        return {
          name,
          count: null,
          error: error instanceof Error ? error.message : "Unavailable",
        };
      }
    }),
  );

  const isLocal = adapter.provider === "local";

  return (
    <>
      <PageHeader
        title="Database"
        description="Which backend this project is talking to, and what is stored in it."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/settings/connections">
              <Share2 className="size-4" />
              Change connection
            </Link>
          </Button>
        }
      />

      <div className="space-y-5">
        <Card>
          <CardHeader
            title="Connection"
            action={
              <Badge tone={health.ok ? "success" : "danger"}>
                {health.ok ? "Connected" : "Not available"}
              </Badge>
            }
          />
          <CardBody className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              {health.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              <span>{health.message}</span>
            </div>

            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <dt className="text-muted-foreground">Adapter</dt>
                <dd className="font-medium capitalize">{adapter.provider}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <dt className="text-muted-foreground">Storage</dt>
                <dd className="font-medium capitalize">{config.storage}</dd>
              </div>

              {Object.entries(health.details ?? {}).map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between gap-4 border-b border-border pb-2"
                >
                  <dt className="text-muted-foreground">{key}</dt>
                  <dd className="truncate font-mono text-xs">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {isLocal ? (
          <p className="flex items-start gap-2 rounded-md border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] px-3 py-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
            <span>
              You are on the local JSON adapter. It is for development only —
              there is no cross-process locking, and serverless hosts wipe the
              filesystem between requests. Connect a real database under{" "}
              <Link
                href="/admin/settings/connections"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Settings → Connections
              </Link>{" "}
              before going live, and copy your content across while you are
              there.
            </span>
          </p>
        ) : null}

        <Card>
          <CardHeader
            title="Collections"
            description="Record counts straight from the adapter."
          />
          <Table>
            <THead>
              <tr>
                <TH>Collection</TH>
                <TH className="text-right">Records</TH>
              </tr>
            </THead>
            <TBody>
              {counts.map((entry) => (
                <TR key={entry.name}>
                  <TD className="font-mono text-xs">{entry.name}</TD>
                  <TD className="text-right tabular-nums">
                    {entry.count ?? (
                      <span className="text-xs text-destructive">
                        {"error" in entry ? entry.error : "Unavailable"}
                      </span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      </div>
    </>
  );
}
