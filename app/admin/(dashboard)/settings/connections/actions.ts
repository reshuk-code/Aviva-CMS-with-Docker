"use server";

import { promises as fs } from "node:fs";
import path from "node:path";

import {
  actionError,
  actionSuccess,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth";
import { resolveDatabase } from "@/lib/connections/resolve";
import { COLLECTIONS } from "@/lib/database/adapter";
import { createDatabaseAdapter, getDatabase } from "@/lib/database";
import { splitSqlStatements } from "@/lib/connections/sql-statements";
import type { BaseRecord } from "@/types/common";
import { DATABASE_PROVIDER_IDS, type DatabaseProviderId } from "@/types/connections";

/**
 * Setup tools — DEVELOPMENT ONLY.
 *
 * Applying a schema and copying data are things you do once, on your own
 * machine, while wiring a project up. Running them on a live server is how
 * production data gets overwritten by accident, so they refuse to run there.
 *
 * Deploy after the backend is prepared, not before.
 */
function assertDevelopment(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "This tool only runs in development. Prepare the database locally with " +
        "`npm run dev`, then deploy.",
    );
  }
}

function assertProvider(value: string): DatabaseProviderId {
  if (!DATABASE_PROVIDER_IDS.includes(value as DatabaseProviderId)) {
    throw new Error(`Unknown database provider "${value}".`);
  }
  return value as DatabaseProviderId;
}

/** Reads a checked-in schema file so the UI can show or run it. */
export async function readSchemaAction(
  provider: string,
): Promise<{ ok: true; sql: string } | { ok: false; message: string }> {
  try {
    await requirePermission("database.read");
    const id = assertProvider(provider);

    const file = path.join(process.cwd(), "adapters", id, "schema.sql");
    return { ok: true, sql: await fs.readFile(file, "utf8") };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "That provider has no schema file.",
    };
  }
}

/**
 * Applies the schema to the configured backend.
 *
 * Only Neon can do this from here: its driver speaks SQL. The Supabase client
 * talks to PostgREST, which cannot run DDL, so that path stays "copy this into
 * the SQL editor" — and the UI says so rather than pretending.
 */
export async function applySchemaAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    assertDevelopment();
    await requirePermission("database.update");

    const id = assertProvider(formString(formData.get("provider")));

    if (id !== "neon") {
      return actionError(
        `The ${id} schema has to be run in that provider's own SQL editor. ` +
          "Copy the SQL below and paste it there.",
      );
    }

    const { credentials } = resolveDatabase();
    if (!credentials.connectionString) {
      return actionError(
        "NEON_DATABASE_URL is not set in .env.local, so there is nothing to connect to.",
      );
    }

    const file = path.join(process.cwd(), "adapters", "neon", "schema.sql");
    const sql = await fs.readFile(file, "utf8");

    // Neon's HTTP driver sends one statement per request, so the file is split
    // rather than passed through whole — otherwise Postgres answers "cannot
    // insert multiple commands into a prepared statement".
    const statements = splitSqlStatements(sql);

    const { neon } = await import("@neondatabase/serverless");
    const query = neon(credentials.connectionString);

    for (const [index, statement] of statements.entries()) {
      try {
        await query.query(statement);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        return actionError(
          `Statement ${index + 1} of ${statements.length} failed: ${reason}. ` +
            "The schema is written so it can be re-run safely, so fix the cause and try again.",
        );
      }
    }

    return actionSuccess(
      `Schema applied — ${statements.length} statements ran. The CMS tables are ready.`,
    );
  } catch (error) {
    return toActionState(error);
  }
}

/**
 * Copies every record from one backend to another.
 *
 * Ids are preserved, so re-running overwrites rather than duplicating and
 * references between records survive. Nothing is deleted from the source.
 */
export async function copyDataAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    assertDevelopment();
    await requirePermission("database.update");

    const targetId = assertProvider(formString(formData.get("target")));
    const { id: sourceId, credentials: sourceCredentials } = resolveDatabase();

    if (sourceId === targetId) {
      return actionError("The source and destination are the same backend.");
    }

    const target = await createDatabaseAdapter(
      targetId,
      resolveFor(targetId),
    );
    await target.init();

    const source = await createDatabaseAdapter(sourceId, sourceCredentials);
    await source.init();

    let copied = 0;

    for (const name of COLLECTIONS) {
      const records = await source.collection<BaseRecord>(name).findMany({});
      const destination = target.collection<BaseRecord>(name);

      for (const record of records) {
        const { id, createdAt: _c, updatedAt: _u, ...rest } = record;
        const existing = await destination.findById(id);

        if (existing) await destination.update(id, rest as Partial<BaseRecord>);
        else await destination.create({ ...rest, id } as never);

        copied += 1;
      }
    }

    // Site settings live in the key/value area, not a collection, and a site
    // that arrives without them looks broken.
    const settings = await (await getDatabase()).kv.get("site_settings");
    if (settings !== null) await target.kv.set("site_settings", settings);

    return actionSuccess(
      `Copied ${copied} record${copied === 1 ? "" : "s"} to ${targetId}. ` +
        `Nothing was removed from ${sourceId}. Set CMS_DATABASE=${targetId} in ` +
        ".env.local to switch over.",
    );
  } catch (error) {
    return toActionState(error);
  }
}

/** Credentials for a provider that is not the active one. */
function resolveFor(id: DatabaseProviderId): Record<string, string> {
  switch (id) {
    case "supabase":
      return {
        url: process.env.SUPABASE_URL ?? "",
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
        tablePrefix: process.env.SUPABASE_TABLE_PREFIX ?? "",
      };
    case "neon":
      return {
        connectionString: process.env.NEON_DATABASE_URL ?? "",
        tablePrefix: process.env.NEON_TABLE_PREFIX ?? "",
      };
    case "mongodb":
      return {
        uri: process.env.MONGODB_URI ?? "",
        database: process.env.MONGODB_DB ?? "",
      };
    default:
      return {};
  }
}

/** Opens a connection and reports what happened. Safe to run anywhere. */
export async function testConnectionAction(
  provider: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    await requirePermission("database.read");
    const id = assertProvider(provider);

    const adapter = await createDatabaseAdapter(id, resolveFor(id));
    await adapter.init();
    const health = await adapter.health();

    return { ok: health.ok, message: health.message };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown error.",
    };
  }
}
