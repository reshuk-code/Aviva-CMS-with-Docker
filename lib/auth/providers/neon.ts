import "server-only";

import { AdapterNotConfiguredError } from "@/lib/database/adapter";
import type { ProviderCredentials } from "@/types/connections";
import type { CmsUser, Session } from "@/types/user";

import type { AuthAdapter } from "../adapter";
import { linkExternalIdentity } from "../link";
import {
  clearSessionCookie,
  readSessionCookie,
  sessionExpiry,
  writeSessionCookie,
} from "../session";

/**
 * Neon Auth — STATUS: implemented, not yet run against a live project.
 *
 * Neon Auth is Stack Auth under the hood, and Stack exposes a REST API for
 * password sign-in. Calling it with `fetch` keeps this a zero-dependency
 * integration: no SDK to install, nothing extra in the bundle for projects
 * that use a different provider.
 *
 * Integration shape matches Supabase Auth: Neon verifies the password, the CMS
 * issues the session and owns roles.
 */
const STACK_API = "https://api.stack-auth.com/api/v1";

interface StackConfig {
  projectId: string;
  publishableClientKey: string;
  secretServerKey: string;
}

function readConfig(credentials: ProviderCredentials): StackConfig {
  const projectId = credentials.projectId?.trim();
  const publishableClientKey = credentials.publishableClientKey?.trim();
  const secretServerKey = credentials.secretServerKey?.trim();

  if (!projectId || !publishableClientKey || !secretServerKey) {
    throw new AdapterNotConfiguredError(
      "neon auth",
      "set NEON_AUTH_PROJECT_ID, NEON_AUTH_PUBLISHABLE_KEY and " +
        "NEON_AUTH_SECRET_KEY in .env.local.",
    );
  }

  return { projectId, publishableClientKey, secretServerKey };
}

interface SignInResponse {
  access_token?: string;
  refresh_token?: string;
}

interface StackUser {
  primary_email?: string | null;
  display_name?: string | null;
}

export function createNeonAuthAdapter(
  credentials: ProviderCredentials,
): AuthAdapter {
  return {
    provider: "neon",
    signInMode: "credentials",

    async authenticate({ email, password }): Promise<CmsUser | null> {
      const config = readConfig(credentials);

      const headers = {
        "content-type": "application/json",
        "x-stack-access-type": "server",
        "x-stack-project-id": config.projectId,
        "x-stack-publishable-client-key": config.publishableClientKey,
        "x-stack-secret-server-key": config.secretServerKey,
      };

      const signIn = await fetch(`${STACK_API}/auth/password/sign-in`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password }),
        cache: "no-store",
      });

      // Any non-2xx here means the credentials were rejected. The specific
      // reason is deliberately not surfaced to the sign-in form.
      if (!signIn.ok) return null;

      const tokens = (await signIn.json()) as SignInResponse;
      if (!tokens.access_token) return null;

      const profile = await fetch(`${STACK_API}/users/me`, {
        headers: { ...headers, "x-stack-access-token": tokens.access_token },
        cache: "no-store",
      });

      if (!profile.ok) return null;

      const user = (await profile.json()) as StackUser;
      if (!user.primary_email) return null;

      const outcome = await linkExternalIdentity({
        email: user.primary_email,
        name: user.display_name,
      });

      return outcome.ok ? outcome.user : null;
    },

    async createSession(user: CmsUser): Promise<Session> {
      const session: Session = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        expiresAt: sessionExpiry(),
      };
      await writeSessionCookie(session);
      return session;
    },

    getSession(): Promise<Session | null> {
      return readSessionCookie();
    },

    destroySession(): Promise<void> {
      return clearSessionCookie();
    },
  };
}
