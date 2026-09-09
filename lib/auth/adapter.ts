import type { CmsUser, Session } from "@/types/user";
import type { SignInMode } from "@/types/connections";

/**
 * The authentication contract.
 *
 * The CMS never calls a password check or a cookie API directly — it calls
 * these methods. Swapping the built-in provider for Supabase Auth, Neon Auth,
 * Clerk or a client's SSO is a new implementation plus one entry in the
 * registry, with no changes to any guard or admin page.
 *
 * Authorisation is deliberately NOT part of this interface. Roles and
 * permissions belong to the CMS (lib/auth/permissions.ts) so they survive a
 * change of identity provider: the provider says *who you are*, the CMS says
 * *what you may do*.
 *
 * Two integration shapes are supported, declared by `signInMode`:
 *
 * - `credentials` — the provider verifies an email and password, and the CMS
 *   issues its own signed-cookie session. The built-in login form is used.
 *   Built-in, Supabase Auth and Neon Auth work this way.
 *
 * - `hosted` — the provider owns the sign-in UI *and* the session; the CMS
 *   reads that session and maps it onto a CMS user. Clerk works this way,
 *   because it does not support verifying a password from your own form.
 */
export interface AuthAdapter {
  readonly provider: string;
  readonly signInMode: SignInMode;

  /**
   * Verifies credentials and returns the matching CMS user, or null.
   *
   * Implementations must not distinguish "no such user" from "wrong password"
   * in what they return; the caller shows one generic message.
   *
   * `hosted` providers return null here — their sign-in does not go through
   * this form.
   */
  authenticate(credentials: {
    email: string;
    password: string;
  }): Promise<CmsUser | null>;

  /** Starts a session for a user. A no-op for `hosted` providers. */
  createSession(user: CmsUser): Promise<Session>;

  /** Reads the current session from the incoming request, or null. */
  getSession(): Promise<Session | null>;

  /** Ends the current session. */
  destroySession(): Promise<void>;

  /**
   * Where a `hosted` provider's sign-in screen lives. The login page redirects
   * here instead of rendering the email/password form.
   */
  readonly hostedSignInPath?: string;
}
