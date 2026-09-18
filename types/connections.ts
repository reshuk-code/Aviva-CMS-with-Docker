/**
 * Backend connections: which database, storage and identity provider this
 * project uses.
 *
 * All of it is configured in `.env.local`. The admin only *reports* what is
 * set — see lib/connections/resolve.ts and lib/connections/status.ts.
 */

export const DATABASE_PROVIDER_IDS = [
  "local",
  "supabase",
  "postgres",
  "neon",
  "mongodb",
  "firebase",
] as const;

export type DatabaseProviderId = (typeof DATABASE_PROVIDER_IDS)[number];

export const STORAGE_PROVIDER_IDS = ["local", "supabase", "s3"] as const;

export type StorageProviderId = (typeof STORAGE_PROVIDER_IDS)[number];

export const AUTH_PROVIDER_IDS = [
  "credentials",
  "supabase",
  "neon",
  "clerk",
] as const;

export type AuthProviderId = (typeof AUTH_PROVIDER_IDS)[number];

export type ConnectionKind = "database" | "storage" | "auth";

/** Credential values for one provider, keyed by field name. */
export type ProviderCredentials = Record<string, string>;

/**
 * How a provider handles sign-in.
 *
 * - `credentials`: it verifies an email and password, and the CMS issues its
 *   own session cookie. The built-in login form is used.
 * - `hosted`: the provider owns both the sign-in UI and the session. The CMS
 *   reads the session and maps it onto a CMS user.
 */
export type SignInMode = "credentials" | "hosted";

/** Maturity of an integration, shown honestly in the admin. */
export type ProviderStatus =
  /** Implemented and exercised. */
  | "stable"
  /** Implemented, but not yet run against a live instance of this provider. */
  | "unverified"
  /** Present as a typed slot only; selecting it will fail with a clear error. */
  | "unavailable";

export interface ProviderField {
  /** Key the adapter reads it under. */
  name: string;
  label: string;
  required?: boolean;
  help?: string;
  /** The environment variable that supplies it. This is the only source. */
  envVar: string;
}

export interface ProviderDefinition<TId extends string = string> {
  id: TId;
  kind: ConnectionKind;
  label: string;
  /** One line, shown on the provider card. */
  description: string;
  status: ProviderStatus;
  fields: ProviderField[];
  /** Steps the user must complete in the provider's own dashboard. */
  setup?: string[];
  docsUrl?: string;
  /** Auth providers only. */
  signInMode?: SignInMode;
  /** Shown when the provider needs a package that is not installed. */
  requiresPackage?: string;
}

