import "server-only";

import { cookies } from "next/headers";

import type { Session } from "@/types/user";

import { getSessionSecret } from "./secret";

/**
 * Stateless signed-cookie sessions.
 *
 * The cookie holds `base64url(payload).base64url(hmac)`. Signing uses Web
 * Crypto rather than `node:crypto` so the same code runs in middleware (Edge
 * runtime) and in Server Components/Actions (Node runtime).
 *
 * Tradeoff: a stateless session cannot be revoked before it expires. That is
 * acceptable for a small-team admin panel with a 7-day lifetime, and the
 * AuthAdapter seam (lib/auth/adapter.ts) lets a project swap in a
 * database-backed or third-party session store without touching call sites.
 *
 * TODO(phase-4): server-side session revocation for "sign out everywhere".
 */
export const SESSION_COOKIE = "cms_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/** Constant-time comparison, so signature checks do not leak byte positions. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signSession(session: Session): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify(session));
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await getKey(), payload),
  );
  return `${toBase64Url(payload)}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<Session | null> {
  if (!token) return null;

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

  let payload: Uint8Array<ArrayBuffer>;
  let signature: Uint8Array<ArrayBuffer>;
  try {
    payload = fromBase64Url(payloadPart);
    signature = fromBase64Url(signaturePart);
  } catch {
    return null;
  }

  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", await getKey(), payload),
  );
  if (!timingSafeEqual(signature, expected)) return null;

  let session: Session;
  try {
    session = JSON.parse(new TextDecoder().decode(payload)) as Session;
  } catch {
    return null;
  }

  if (!session.userId || !session.role) return null;
  if (session.expiresAt * 1000 <= Date.now()) return null;

  return session;
}

/** Reads and verifies the session from the request cookies. */
export async function readSessionCookie(): Promise<Session | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function writeSessionCookie(session: Session): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function sessionExpiry(): number {
  return Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
}
