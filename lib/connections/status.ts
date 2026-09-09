import {
  AUTH_PROVIDERS,
  DATABASE_PROVIDERS,
  STORAGE_PROVIDERS,
} from "@/config/providers";
import type { ConnectionKind, ProviderDefinition } from "@/types/connections";

import { resolveAuth, resolveDatabase, resolveStorage } from "./resolve";

/**
 * What the Connections screen shows.
 *
 * Pure detection: it looks at the environment and reports what is set. It never
 * reads a credential's value into the view, and nothing here can change a
 * setting — that is `.env.local`'s job.
 */
export interface FieldStatus {
  label: string;
  envVar: string;
  isSet: boolean;
  required: boolean;
  help?: string;
}

export type ConnectionState =
  /** Selected and every required variable is present. */
  | "connected"
  /** Selected but something required is missing. */
  | "incomplete"
  /** Usable if selected: either fully configured, or needing no configuration. */
  | "ready"
  /** Needs environment variables that are not set. */
  | "not_configured"
  /** No adapter exists yet. */
  | "unavailable";

export interface ProviderStatusView {
  definition: ProviderDefinition;
  isActive: boolean;
  state: ConnectionState;
  fields: FieldStatus[];
  /** Required variables that are missing. */
  missing: string[];
}

export interface KindStatus {
  kind: ConnectionKind;
  activeId: string;
  activeLabel: string;
  /** True when an env var chose the provider rather than cms.config.ts. */
  fromEnv: boolean;
  envVar: string;
  providers: ProviderStatusView[];
}

function statusFor(
  definitions: ProviderDefinition[],
  activeId: string,
  kind: ConnectionKind,
  envVar: string,
  fromEnv: boolean,
): KindStatus {
  const providers = definitions.map((definition): ProviderStatusView => {
    const fields = definition.fields.map(
      (field): FieldStatus => ({
        label: field.label,
        envVar: field.envVar,
        isSet: Boolean(process.env[field.envVar]?.trim()),
        required: Boolean(field.required),
        help: field.help,
      }),
    );

    const missing = fields
      .filter((field) => field.required && !field.isSet)
      .map((field) => field.envVar);

    const isActive = definition.id === activeId;
    const complete = missing.length === 0;

    let state: ConnectionState;
    if (definition.status === "unavailable") state = "unavailable";
    else if (isActive) state = complete ? "connected" : "incomplete";
    // A provider with no variables to set (the local adapter) is always ready
    // — reporting it as "not configured" was misleading.
    else if (complete) state = "ready";
    else state = "not_configured";

    return { definition, isActive, state, fields, missing };
  });

  return {
    kind,
    activeId,
    activeLabel:
      providers.find((provider) => provider.isActive)?.definition.label ??
      activeId,
    fromEnv,
    envVar,
    providers,
  };
}

export function getConnectionStatus(): KindStatus[] {
  const database = resolveDatabase();
  const storage = resolveStorage();
  const auth = resolveAuth();

  return [
    statusFor(
      DATABASE_PROVIDERS,
      database.id,
      "database",
      "CMS_DATABASE",
      database.fromEnv,
    ),
    statusFor(
      STORAGE_PROVIDERS,
      storage.id,
      "storage",
      "CMS_STORAGE",
      storage.fromEnv,
    ),
    statusFor(AUTH_PROVIDERS, auth.id, "auth", "CMS_AUTH", auth.fromEnv),
  ];
}

export const STATE_LABELS: Record<ConnectionState, string> = {
  connected: "Connected",
  incomplete: "Missing details",
  ready: "Available",
  not_configured: "Not configured",
  unavailable: "Not built",
};
