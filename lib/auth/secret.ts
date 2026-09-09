import "server-only";

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Resolves the secret used to sign session cookies.
 *
 * Production: `CMS_SESSION_SECRET` is required. Refusing to start is the right
 * behaviour — a generated-per-boot secret would silently log everyone out on
 * every deploy and would differ between serverless instances.
 *
 * Development: if the variable is missing we persist a random secret to
 * `.cms-data/.session-secret` (gitignored) so `npm run dev` works with zero
 * setup and sessions survive a restart.
 */
let cached: string | null = null;

const DEV_SECRET_PATH = path.join(process.cwd(), ".cms-data", ".session-secret");

export function getSessionSecret(): string {
  if (cached) return cached;

  const fromEnv = process.env.CMS_SESSION_SECRET?.trim();
  if (fromEnv) {
    if (fromEnv.length < 32) {
      throw new Error(
        "CMS_SESSION_SECRET must be at least 32 characters. Generate one with:\n" +
          "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    cached = fromEnv;
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CMS_SESSION_SECRET is required in production. Generate one with:\n" +
        "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
        "See .env.example.",
    );
  }

  cached = readOrCreateDevSecret();
  return cached;
}

function readOrCreateDevSecret(): string {
  try {
    if (existsSync(DEV_SECRET_PATH)) {
      const existing = readFileSync(DEV_SECRET_PATH, "utf8").trim();
      if (existing.length >= 32) return existing;
    }

    const generated = randomBytes(32).toString("hex");
    mkdirSync(path.dirname(DEV_SECRET_PATH), { recursive: true });
    writeFileSync(DEV_SECRET_PATH, generated, "utf8");

    console.warn(
      "[cms] CMS_SESSION_SECRET is not set. Generated a development secret at " +
        ".cms-data/.session-secret. Set the env var before deploying.",
    );

    return generated;
  } catch {
    // Read-only filesystem in dev: fall back to a per-process secret. Sessions
    // will not survive a restart, which is acceptable locally.
    console.warn(
      "[cms] Could not persist a development session secret; using an " +
        "in-memory one. Sessions will end when the server restarts.",
    );
    return randomBytes(32).toString("hex");
  }
}
