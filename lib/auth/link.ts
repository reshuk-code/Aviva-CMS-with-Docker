import "server-only";

import { users } from "@/lib/cms/repositories/users";
import type { CmsUser } from "@/types/user";

/**
 * Maps a verified external identity onto a CMS user.
 *
 * Every third-party provider funnels through here, so the rules are stated
 * once instead of three slightly different times.
 *
 * The rules, and why:
 *
 * 1. Match on email. That is the one identifier every provider exposes and
 *    that an administrator can reasonably be asked to type into the Users
 *    screen.
 *
 * 2. If no CMS user exists at all, the first person to sign in becomes the
 *    super admin. Without this a project that starts on Clerk could never
 *    bootstrap: there would be nobody able to create the first user.
 *
 * 3. Otherwise, an unknown email is REFUSED rather than auto-provisioned.
 *    Auto-creating an account for anyone who can sign up with the identity
 *    provider would mean a public Clerk sign-up page is a public admin
 *    sign-up page. An administrator invites people by creating the CMS user
 *    first; the provider then just proves they are who they say.
 *
 * 4. A deactivated CMS user is refused regardless of what the provider says.
 */
export interface ExternalIdentity {
  email: string;
  name?: string | null;
}

export type LinkOutcome =
  | { ok: true; user: CmsUser }
  | { ok: false; reason: "not_invited" | "deactivated" };

export async function linkExternalIdentity(
  identity: ExternalIdentity,
): Promise<LinkOutcome> {
  const email = identity.email.trim().toLowerCase();
  const existing = await users.findByEmail(email);

  if (existing) {
    if (!existing.active) return { ok: false, reason: "deactivated" };
    return { ok: true, user: existing };
  }

  if (await users.isFirstRun()) {
    const created = await users.create({
      email,
      name: identity.name?.trim() || email.split("@")[0],
      // The account is governed by the identity provider, so there is no local
      // password to set. A random one is stored and never used, so the record
      // cannot be signed into with the built-in provider either.
      password: crypto.randomUUID() + crypto.randomUUID(),
      role: "super_admin",
    });
    return { ok: true, user: created };
  }

  return { ok: false, reason: "not_invited" };
}

export const LINK_FAILURE_MESSAGES: Record<
  Extract<LinkOutcome, { ok: false }>["reason"],
  string
> = {
  not_invited:
    "That account is not set up in this CMS. Ask an administrator to add your " +
    "email address under Users first.",
  deactivated: "That account has been deactivated in this CMS.",
};
