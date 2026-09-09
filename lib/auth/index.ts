import "server-only";

import { cache } from "react";

import { resolveAuth } from "@/lib/connections/resolve";
import { ForbiddenError, UnauthorizedError } from "@/lib/cms/errors";
import { users } from "@/lib/cms/repositories/users";
import type { AuthProviderId, ProviderCredentials } from "@/types/connections";
import type { Permission, Session } from "@/types/user";

import type { AuthAdapter } from "./adapter";
import { hasPermission } from "./permissions";

/**
 * Auth registry.
 *
 * The active provider comes from CMS_AUTH in `.env.local`, defaulting to the
 * built-in one.
 *
 * To use a provider that is not listed here, implement `AuthAdapter` and add
 * it to `factories`. Nothing else in the codebase needs to change.
 */
type Factory = (credentials: ProviderCredentials) => Promise<AuthAdapter>;

const factories: Record<AuthProviderId, Factory> = {
  credentials: async () =>
    (await import("./providers/credentials")).createCredentialsAuthAdapter(),
  supabase: async (credentials) =>
    (await import("./providers/supabase")).createSupabaseAuthAdapter(credentials),
  neon: async (credentials) =>
    (await import("./providers/neon")).createNeonAuthAdapter(credentials),
  clerk: async (credentials) =>
    (await import("./providers/clerk")).createClerkAuthAdapter(credentials),
};

let instance: Promise<AuthAdapter> | null = null;

export function getAuthAdapter(): Promise<AuthAdapter> {
  instance ??= (async () => {
    const { id, credentials } = resolveAuth();
    const factory = factories[id] ?? factories.credentials;
    return factory(credentials);
  })().catch((error: unknown) => {
    instance = null;
    throw error;
  });

  return instance;
}

/**
 * The current session, or null.
 *
 * Wrapped in React's `cache` so several Server Components on one page share a
 * single verification instead of repeating it — which matters more for the
 * hosted providers, where reading the session is a network call.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const adapter = await getAuthAdapter();
  return adapter.getSession();
});

/**
 * SERVER-SIDE AUTHORISATION.
 *
 * Every server action and route handler that mutates data calls one of these
 * first. UI-level checks exist only to hide controls; they are not the
 * boundary (§17, §24.4).
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  return session;
}

export async function requirePermission(
  permission: Permission,
): Promise<Session> {
  const session = await requireSession();

  // Extra grants live on the user record, not in the session, so revoking one
  // takes effect immediately rather than at the next sign-in. This also means
  // deactivating a user locks them out at once, whatever the provider thinks.
  const user = await users.get(session.userId);
  if (!user || !user.active) throw new UnauthorizedError();

  if (
    !hasPermission(
      { role: session.role, extraPermissions: user.extraPermissions },
      permission,
    )
  ) {
    throw new ForbiddenError(
      `Your role (${session.role}) cannot perform "${permission}".`,
    );
  }

  return session;
}

/** Non-throwing check, for conditionally rendering admin UI. */
export async function can(permission: Permission): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return hasPermission({ role: session.role }, permission);
}

export async function signIn(credentials: {
  email: string;
  password: string;
}): Promise<Session | null> {
  const auth = await getAuthAdapter();
  const user = await auth.authenticate(credentials);
  if (!user) return null;
  return auth.createSession(user);
}

export async function signOut(): Promise<void> {
  const auth = await getAuthAdapter();
  await auth.destroySession();
}

export {
  hasPermission,
  hasAnyPermission,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from "./permissions";
export type { AuthAdapter } from "./adapter";
