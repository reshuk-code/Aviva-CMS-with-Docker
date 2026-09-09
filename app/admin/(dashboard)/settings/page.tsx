import Link from "next/link";
import { ChevronRight, Share2 } from "lucide-react";

import { SettingsForm } from "@/app/admin/(dashboard)/settings/settings-form";
import { PageHeader } from "@/components/cms/page-header";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { isModuleEnabled } from "@/lib/cms/config";
import { resolveDatabase } from "@/lib/connections/resolve";
import { settings } from "@/lib/cms/repositories/settings";
import { databaseProvider } from "@/config/providers";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  const session = await requirePermission("settings.read");
  const current = await settings.get();

  const showConnections =
    isModuleEnabled("database") &&
    hasPermission({ role: session.role }, "database.read");

  const database = showConnections ? resolveDatabase() : null;
  const databaseLabel = database
    ? (databaseProvider(database.id)?.label ?? database.id)
    : null;

  return (
    <>
      <PageHeader
        title="Site settings"
        description="Details your whole website reads: name, contact information, social profiles and tracking IDs."
      />

      {showConnections ? (
        <Link
          href="/admin/settings/connections"
          className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
        >
          <span className="flex items-start gap-3">
            <Share2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <span>
              <span className="block text-sm font-medium">
                Database, storage &amp; sign-in
              </span>
              <span className="block text-sm text-muted-foreground">
                Connect your own Supabase, Neon or MongoDB project, and choose
                who verifies sign-ins. Currently using{" "}
                <strong>{databaseLabel}</strong>.
              </span>
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ) : null}

      <SettingsForm
        settings={current}
        readOnly={!hasPermission({ role: session.role }, "settings.update")}
      />
    </>
  );
}
