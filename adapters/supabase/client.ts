import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AdapterNotConfiguredError } from "@/lib/database/adapter";
import type { ProviderCredentials } from "@/types/connections";

/**
 * Server-side Supabase client.
 *
 * Credentials are passed in rather than read from `process.env` here, which
 * keeps the adapter testable and lets the setup tools open a second connection
 * to a backend that is not the active one. They are read from the environment
 * in lib/connections/resolve.ts.
 *
 * The `server-only` import means importing this from a Client Component is a
 * build error rather than a leaked service-role key.
 */
export interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  tablePrefix: string;
}

export function readSupabaseConfig(
  credentials: ProviderCredentials,
): SupabaseConfig {
  const url = credentials.url?.trim();
  const serviceRoleKey = credentials.serviceRoleKey?.trim();

  if (!url) {
    throw new AdapterNotConfiguredError(
      "supabase",
      "SUPABASE_URL is not set in .env.local.",
    );
  }
  if (!serviceRoleKey) {
    throw new AdapterNotConfiguredError(
      "supabase",
      "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.",
    );
  }

  return {
    url,
    serviceRoleKey,
    tablePrefix: credentials.tablePrefix?.trim() || "cms_",
  };
}

export function createSupabaseAdminClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
