import "server-only";

import { resolveDatabase } from "@/lib/connections/resolve";
import type { DatabaseProviderId, ProviderCredentials } from "@/types/connections";

import type { DatabaseAdapter } from "./adapter";

/**
 * Adapter registry.
 *
 * Resolves the configured provider and its credentials, constructs the
 * matching adapter, initialises it once, and hands the same instance to every
 * caller for the lifetime of the process.
 *
 * Adapters are loaded with dynamic `import()` so a project on Supabase never
 * evaluates the MongoDB, Neon or Firebase modules.
 *
 * Credentials are resolved here rather than inside each adapter, so an adapter
 * stays a pure translation layer and the setup tools can open a second
 * connection to a backend that is not the active one.
 */
type Factory = (credentials: ProviderCredentials) => Promise<DatabaseAdapter>;

const factories: Record<DatabaseProviderId, Factory> = {
  local: async () => (await import("@/adapters/local")).createLocalAdapter(),
  supabase: async (credentials) =>
    (await import("@/adapters/supabase")).createSupabaseAdapter(credentials),
  neon: async (credentials) =>
    (await import("@/adapters/neon")).createNeonAdapter(credentials),
  mongodb: async (credentials) =>
    (await import("@/adapters/mongodb")).createMongoAdapter(credentials),
  firebase: async () => (await import("@/adapters/firebase")).createFirebaseAdapter(),
};

let instance: Promise<DatabaseAdapter> | null = null;

export function getDatabase(): Promise<DatabaseAdapter> {
  instance ??= (async () => {
    const { id, credentials } = resolveDatabase();
    const factory = factories[id];

    if (!factory) {
      throw new Error(
        `Unknown database provider "${id}". Expected one of: ${Object.keys(factories).join(", ")}.`,
      );
    }

    const adapter = await factory(credentials);
    await adapter.init();
    return adapter;
  })().catch((error: unknown) => {
    // Do not cache a failed initialisation: a credential fixed in the admin or
    // in .env should take effect on the next request without a restart.
    instance = null;
    throw error;
  });

  return instance;
}

/**
 * Builds an adapter for a provider WITHOUT making it the active one.
 *
 * Used by the Connections screen to test credentials before saving them, and
 * by the migration tool, which needs both the old and the new backend open at
 * the same time.
 */
export async function createDatabaseAdapter(
  id: DatabaseProviderId,
  credentials: ProviderCredentials,
): Promise<DatabaseAdapter> {
  const factory = factories[id];
  if (!factory) throw new Error(`Unknown database provider "${id}".`);
  return factory(credentials);
}

/** Drops the cached adapter so the next call re-resolves the connection. */
export function resetDatabase(): void {
  instance = null;
}

export * from "./adapter";
