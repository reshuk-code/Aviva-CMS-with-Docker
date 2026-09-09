import { redirect } from "next/navigation";

import { SetupForm } from "@/app/admin/setup/setup-form";
import { getCmsConfig } from "@/lib/cms/config";
import { getDatabase } from "@/lib/database";
import { users } from "@/lib/cms/repositories/users";

export const metadata = { title: "Set up" };

// Whether setup is still pending is database state, so this page must never be
// prerendered at build time.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (!(await users.isFirstRun())) redirect("/admin/login");

  const config = getCmsConfig();
  const adapter = await getDatabase();
  const health = await adapter.health();

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-semibold tracking-tight">
            Set up your CMS
          </h1>
          <p className="text-sm text-muted-foreground">
            Create the first administrator account. You can add colleagues
            afterwards.
          </p>
        </div>

        <SetupForm
          defaultSiteName={config.siteName}
          provider={adapter.provider}
          providerMessage={health.message}
          providerOk={health.ok}
        />
      </div>
    </main>
  );
}
