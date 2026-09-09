import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthAdapter } from "@/lib/auth";
import { getCmsConfig } from "@/lib/cms/config";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/**
 * Hosted sign-in.
 *
 * Only reachable when a `hosted` provider (currently Clerk) is active — the
 * provider renders its own form here. Anything else is sent back to the CMS
 * login page, so this route cannot become a second, confusing way in.
 */
export default async function HostedSignInPage() {
  const adapter = await getAuthAdapter();
  if (adapter.signInMode !== "hosted") redirect("/admin/login");

  const config = getCmsConfig();
  const configured =
    Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) &&
    Boolean(process.env.CLERK_SECRET_KEY);

  return (
    <main className="grid min-h-dvh place-items-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-lg font-semibold tracking-tight">
            {config.admin.brandName ?? config.siteName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with {adapter.provider}.
          </p>
        </div>

        {configured ? (
          <ClerkSignIn />
        ) : (
          <div className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-5 text-sm">
            <p className="font-medium text-destructive">
              {adapter.provider} is selected but not fully wired up.
            </p>
            <p className="text-muted-foreground">
              A hosted provider starts before any CMS code runs, so its keys
              must be present as environment variables — saving them in the
              admin alone is not enough. Set{" "}
              <code className="rounded bg-muted px-1">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              </code>
              ,{" "}
              <code className="rounded bg-muted px-1">CLERK_SECRET_KEY</code>{" "}
              and <code className="rounded bg-muted px-1">CMS_AUTH=clerk</code>,
              then restart the server.
            </p>
            <p className="text-muted-foreground">
              To get back in meanwhile, unset{" "}
              <code className="rounded bg-muted px-1">CMS_AUTH</code> and use{" "}
              <Link
                href="/admin/login"
                className="text-primary underline-offset-2 hover:underline"
              >
                the built-in sign-in
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Clerk's own component. Imported lazily so a project that never selects Clerk
 * does not pull it into the admin bundle.
 */
async function ClerkSignIn() {
  const { SignIn } = await import("@clerk/nextjs");
  return <SignIn routing="hash" />;
}
