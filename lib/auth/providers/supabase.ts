import "server-only";

import { createClient } from "@supabase/supabase-js";

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
 * Supabase Auth — STATUS: implemented, not yet run against a live project.
 *
 * Integration shape: Supabase verifies the password, the CMS issues the
 * session.
 *
 * Why not hand session management to Supabase as well: doing that means
 * juggling Supabase's access/refresh cookies through Next's Server Components
 * (the `@supabase/ssr` dance) for no gain here — the CMS already has a signed
 * session it trusts, and roles live in the CMS regardless. Verifying the
 * password is the part Supabase is actually being asked to do.
 *
 * Consequence worth knowing: signing out of Supabase elsewhere does not end
 * the CMS session, which lasts until its cookie expires. Deactivating the user
 * in CMS Users takes effect immediately.
 *
 * The anon key is sufficient — `signInWithPassword` is a public endpoint. The
 * service role key is deliberately not used here.
 */
function resolveCredentials(credentials: ProviderCredentials): {
  url: string;
  anonKey: string;
} {
  // Falls back to the Supabase database connection, so a project using both
  // does not type the same project URL twice.
  const url =
    credentials.url?.trim() || process.env.SUPABASE_URL?.trim() || "";
  const anonKey = credentials.anonKey?.trim() ?? "";

  if (!url) {
    throw new AdapterNotConfiguredError(
      "supabase auth",
      "neither SUPABASE_AUTH_URL nor SUPABASE_URL is set in .env.local.",
    );
  }
  if (!anonKey) {
    throw new AdapterNotConfiguredError(
      "supabase auth",
      "SUPABASE_AUTH_ANON_KEY is not set in .env.local.",
    );
  }

  return { url, anonKey };
}

export function createSupabaseAuthAdapter(
  credentials: ProviderCredentials,
): AuthAdapter {
  return {
    provider: "supabase",
    signInMode: "credentials",

    async authenticate({ email, password }): Promise<CmsUser | null> {
      const { url, anonKey } = resolveCredentials(credentials);

      const client = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user?.email) return null;

      // The password was correct, but that only establishes identity. Whether
      // this person may use the admin — and as what — is the CMS's decision.
      const outcome = await linkExternalIdentity({
        email: data.user.email,
        name:
          (data.user.user_metadata?.full_name as string | undefined) ??
          (data.user.user_metadata?.name as string | undefined) ??
          null,
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
