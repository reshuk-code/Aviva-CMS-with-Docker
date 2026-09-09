import { redirect } from "next/navigation";

import { LoginForm } from "@/app/admin/login/login-form";
import { getAuthAdapter, getSession } from "@/lib/auth";
import { getCmsConfig } from "@/lib/cms/config";
import { users } from "@/lib/cms/repositories/users";

export const metadata = { title: "Sign in" };

// Which provider is active is runtime state.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Nobody has been created yet: send them to setup rather than an
  // unpassable sign-in form.
  if (await users.isFirstRun()) redirect("/admin/setup");
  if (await getSession()) redirect("/admin");

  // A hosted provider (Clerk) owns its own sign-in screen, so showing a
  // password form here would be a dead end.
  const adapter = await getAuthAdapter();
  if (adapter.signInMode === "hosted") {
    redirect(adapter.hostedSignInPath ?? "/admin/sign-in");
  }

  const { next } = await searchParams;
  const config = getCmsConfig();

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-semibold tracking-tight">
            {config.admin.brandName ?? config.siteName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to manage your website.
          </p>
        </div>

        <LoginForm next={next} />
      </div>
    </main>
  );
}
