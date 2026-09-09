import "server-only";

import { resolveStorage } from "@/lib/connections/resolve";
import type { ProviderCredentials, StorageProviderId } from "@/types/connections";

import type { StorageAdapter } from "./adapter";

/**
 * Storage adapter registry. Mirrors lib/database/index.ts.
 *
 * Storage is resolved independently of the database, so a project can keep
 * content in Neon and media in Supabase Storage if that suits it.
 *
 * Implemented: local, Supabase Storage. S3/R2 is Phase 4.
 */
type Factory = (credentials: ProviderCredentials) => Promise<StorageAdapter>;

const factories: Record<StorageProviderId, Factory> = {
  local: async () => (await import("./providers/local")).createLocalStorageAdapter(),
  supabase: async (credentials) =>
    (await import("./providers/supabase")).createSupabaseStorageAdapter(credentials),
  s3: async () => (await import("./providers/s3")).createS3StorageAdapter(),
};

let instance: Promise<StorageAdapter> | null = null;

export function getStorage(): Promise<StorageAdapter> {
  instance ??= (async () => {
    const { id, credentials } = resolveStorage();
    const factory = factories[id];

    if (!factory) {
      throw new Error(
        `Unknown storage provider "${id}". Expected one of: ${Object.keys(factories).join(", ")}.`,
      );
    }

    return factory(credentials);
  })().catch((error: unknown) => {
    instance = null;
    throw error;
  });

  return instance;
}

export function resetStorage(): void {
  instance = null;
}

export * from "./adapter";
