import "server-only";

import userConfig from "@/cms.config";
import {
  cmsConfigSchema,
  DEFAULT_MODULES,
  type CmsConfig,
  type CmsModuleKey,
} from "./define-config";

/**
 * Loads, validates and freezes the project configuration.
 *
 * This owns the parts of `cms.config.ts` that are about the *project*: its
 * name, which modules are switched on, how the admin is branded.
 *
 * Which backend is in use is NOT resolved here — that lives in
 * lib/connections/resolve.ts, reading `.env.local`. Keeping the two separate
 * means there is one answer to "where does the database setting come from?"
 * instead of two places that can disagree.
 */
function issues(list: { path: PropertyKey[]; message: string }[]): string {
  return list
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function load(): CmsConfig {
  const parsed = cmsConfigSchema.safeParse(userConfig);
  if (!parsed.success) {
    throw new Error(`Invalid cms.config.ts:\n${issues(parsed.error.issues)}`);
  }

  return Object.freeze({
    ...parsed.data,
    siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? parsed.data.siteUrl).replace(
      /\/$/,
      "",
    ),
  });
}

let cached: CmsConfig | null = null;

export function getCmsConfig(): CmsConfig {
  cached ??= load();
  return cached;
}

/** Effective on/off state of a module, honouring per-project overrides. */
export function isModuleEnabled(key: CmsModuleKey): boolean {
  return getCmsConfig().modules[key] ?? DEFAULT_MODULES[key];
}

export function getEnabledModules(): CmsModuleKey[] {
  return (Object.keys(DEFAULT_MODULES) as CmsModuleKey[]).filter(
    isModuleEnabled,
  );
}

export type { CmsConfig, CmsModuleKey };
