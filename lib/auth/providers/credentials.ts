import "server-only";

import { users } from "@/lib/cms/repositories/users";
import type { CmsUser, Session } from "@/types/user";

import type { AuthAdapter } from "../adapter";
import { verifyPassword } from "../password";
import {
  clearSessionCookie,
  readSessionCookie,
  sessionExpiry,
  writeSessionCookie,
} from "../session";

/**
 * Email + password authentication against the CMS `users` collection.
 *
 * This is the default provider: it works with any database adapter and needs
 * no third-party account, which matters for an agency spinning up client sites
 * quickly. Projects that need SSO implement `AuthAdapter` instead.
 */
export function createCredentialsAuthAdapter(): AuthAdapter {
  return {
    provider: "credentials",
    signInMode: "credentials",

    async authenticate({ email, password }): Promise<CmsUser | null> {
      const user = await users.findByEmailWithSecret(email);

      // Hash a throwaway value when the user does not exist so that a missing
      // account and a wrong password take comparable time.
      if (!user) {
        await verifyPassword(password, null);
        return null;
      }

      if (!user.active) return null;
      if (!(await verifyPassword(password, user.passwordHash))) return null;

      const { passwordHash: _passwordHash, ...safe } = user;
      return safe;
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
      await users.recordLogin(user.id);
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
