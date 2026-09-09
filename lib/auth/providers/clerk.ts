import "server-only";

import { AdapterNotConfiguredError } from "@/lib/database/adapter";
import type { ProviderCredentials } from "@/types/connections";
import type { CmsUser, Session } from "@/types/user";

import type { AuthAdapter } from "../adapter";
import { linkExternalIdentity } from "../link";
import { sessionExpiry } from "../session";

/**
 * Clerk — STATUS: implemented, not yet run against a live Clerk application.
 *
 * Integration shape: `hosted`. Unlike Supabase and Neon, Clerk does not offer a
 * server-side "check this password" call — sign-in goes through Clerk's own
 * components. So Clerk owns both the sign-in screen and the session, and the
 * CMS reads that session rather than issuing one.
 *
 * Consequences, which the Connections screen states:
 *   - Clerk keys and CMS_AUTH=clerk must be in `.env.local`, because Clerk's
 *     middleware and provider initialise before any CMS code runs.
 *   - `proxy.ts` runs `clerkMiddleware()` when that is the case.
 *   - Signing out happens through Clerk.
 *
 * Roles still come from the CMS: Clerk says who you are, `linkExternalIdentity`
 * decides whether that person may use the admin and as what.
 */
interface ClerkAuthResult {
  userId: string | null;
}

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  emailAddresses: { id: string; emailAddress: string }[];
}

function assertConfigured(credentials: ProviderCredentials): void {
  const publishableKey =
    credentials.publishableKey?.trim() ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = credentials.secretKey?.trim() || process.env.CLERK_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    throw new AdapterNotConfiguredError(
      "clerk",
      "set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY in " +
        ".env.local. Clerk's middleware starts before any CMS code runs, so " +
        "they have to be environment variables.",
    );
  }
}

export function createClerkAuthAdapter(
  credentials: ProviderCredentials,
): AuthAdapter {
  return {
    provider: "clerk",
    signInMode: "hosted",
    hostedSignInPath: "/admin/sign-in",

    async authenticate(): Promise<CmsUser | null> {
      // Clerk's sign-in does not pass through the CMS form.
      return null;
    },

    async createSession(user: CmsUser): Promise<Session> {
      // Clerk already established the session; this just describes it.
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        expiresAt: sessionExpiry(),
      };
    },

    async getSession(): Promise<Session | null> {
      assertConfigured(credentials);

      let auth: () => Promise<ClerkAuthResult>;
      let clerkClient: () => Promise<{
        users: { getUser(id: string): Promise<ClerkUser> };
      }>;

      try {
        ({ auth, clerkClient } = (await import("@clerk/nextjs/server")) as unknown as {
          auth: () => Promise<ClerkAuthResult>;
          clerkClient: () => Promise<{
            users: { getUser(id: string): Promise<ClerkUser> };
          }>;
        });
      } catch {
        throw new AdapterNotConfiguredError(
          "clerk",
          "the `@clerk/nextjs` package is not installed. Run: npm install @clerk/nextjs",
        );
      }

      const { userId } = await auth();
      if (!userId) return null;

      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);

      const email =
        clerkUser.emailAddresses.find(
          (entry) => entry.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;

      if (!email) return null;

      const outcome = await linkExternalIdentity({
        email,
        name: [clerkUser.firstName, clerkUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim(),
      });

      if (!outcome.ok) return null;

      return {
        userId: outcome.user.id,
        email: outcome.user.email,
        name: outcome.user.name,
        role: outcome.user.role,
        expiresAt: sessionExpiry(),
      };
    },

    async destroySession(): Promise<void> {
      // Clerk owns the session cookie; the UI sends the user to Clerk's
      // sign-out rather than clearing anything here.
    },
  };
}
