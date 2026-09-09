import userConfig from "@/cms.config";
import type {
  AuthProviderId,
  DatabaseProviderId,
  ProviderCredentials,
  StorageProviderId,
} from "@/types/connections";
import {
  AUTH_PROVIDER_IDS,
  DATABASE_PROVIDER_IDS,
  STORAGE_PROVIDER_IDS,
} from "@/types/connections";

import { DATABASE_PROVIDERS, STORAGE_PROVIDERS, AUTH_PROVIDERS } from "@/config/providers";

/**
 * Which backend is active, and its credentials.
 *
 * Everything comes from the environment. There is no credential store and no
 * way to change a backend from inside the admin — that keeps one obvious place
 * to look (`.env.local`), makes deployments reproducible, and means nobody can
 * re-point a live site by clicking around in the CMS.
 *
 * Order: environment variable, then the default in `cms.config.ts`.
 */
function pick<T extends readonly string[]>(
  variable: string,
  allowed: T,
  fallback: T[number],
): T[number] {
  const value = process.env[variable]?.trim();
  if (!value) return fallback;

  if (!allowed.includes(value)) {
    throw new Error(
      `Invalid ${variable}="${value}". Expected one of: ${allowed.join(", ")}.`,
    );
  }
  return value as T[number];
}

function credentialsFrom(fields: { name: string; envVar: string }[]): ProviderCredentials {
  const credentials: ProviderCredentials = {};
  for (const field of fields) {
    const value = process.env[field.envVar]?.trim();
    if (value) credentials[field.name] = value;
  }
  return credentials;
}

export interface Resolved<TId extends string> {
  id: TId;
  credentials: ProviderCredentials;
  /** True when an environment variable chose this provider. */
  fromEnv: boolean;
}

export function resolveDatabase(): Resolved<DatabaseProviderId> {
  const fallback = (userConfig.database ?? "local") as DatabaseProviderId;
  const id = pick("CMS_DATABASE", DATABASE_PROVIDER_IDS, fallback);
  const definition = DATABASE_PROVIDERS.find((entry) => entry.id === id);

  return {
    id,
    credentials: credentialsFrom(definition?.fields ?? []),
    fromEnv: Boolean(process.env.CMS_DATABASE?.trim()),
  };
}

export function resolveStorage(): Resolved<StorageProviderId> {
  const fallback = (userConfig.storage ?? "local") as StorageProviderId;
  const id = pick("CMS_STORAGE", STORAGE_PROVIDER_IDS, fallback);
  const definition = STORAGE_PROVIDERS.find((entry) => entry.id === id);

  const credentials = credentialsFrom(definition?.fields ?? []);

  // Supabase Storage reuses the Supabase database credentials unless it was
  // given its own, so nobody types the same project URL and key twice.
  if (id === "supabase") {
    credentials.url ||= process.env.SUPABASE_URL?.trim() ?? "";
    credentials.serviceRoleKey ||=
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  }

  return {
    id,
    credentials,
    fromEnv: Boolean(process.env.CMS_STORAGE?.trim()),
  };
}

export function resolveAuth(): Resolved<AuthProviderId> {
  const id = pick("CMS_AUTH", AUTH_PROVIDER_IDS, "credentials");
  const definition = AUTH_PROVIDERS.find((entry) => entry.id === id);

  const credentials = credentialsFrom(definition?.fields ?? []);

  if (id === "supabase") {
    credentials.url ||= process.env.SUPABASE_URL?.trim() ?? "";
  }

  return {
    id,
    credentials,
    fromEnv: Boolean(process.env.CMS_AUTH?.trim()),
  };
}
