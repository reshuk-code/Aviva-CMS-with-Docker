import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import pg from "pg";

try {
  if ((process.env.CMS_SESSION_SECRET?.trim().length ?? 0) < 32) {
    throw new Error("CMS_SESSION_SECRET must contain at least 32 characters.");
  }
  if (process.env.CMS_DATABASE === "postgres") {
    if (!process.env.POSTGRES_DATABASE_URL) {
      if (!process.env.POSTGRES_PASSWORD) throw new Error("POSTGRES_PASSWORD is required.");
      const url = new URL("postgresql://postgres:5432/cms");
      url.hostname = process.env.POSTGRES_HOST || "postgres";
      url.username = encodeURIComponent(process.env.POSTGRES_USER || "cms");
      url.password = encodeURIComponent(process.env.POSTGRES_PASSWORD);
      url.pathname = `/${encodeURIComponent(process.env.POSTGRES_DB || "cms")}`;
      process.env.POSTGRES_DATABASE_URL = url.href;
    }
    if (process.env.POSTGRES_TABLE_PREFIX && process.env.POSTGRES_TABLE_PREFIX !== "cms_") {
      throw new Error("The bundled Docker schema requires POSTGRES_TABLE_PREFIX=cms_.");
    }
    const client = new pg.Client({
      connectionString: process.env.POSTGRES_DATABASE_URL,
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      await client.query("BEGIN");
      // Serialize initialization when multiple app containers start together.
      await client.query("SELECT pg_advisory_xact_lock(74102501)");
      await client.query(await readFile(new URL("../adapters/postgres/schema.sql", import.meta.url), "utf8"));
      await client.query("COMMIT");
      console.log("[cms] PostgreSQL schema ready.");
    } finally {
      // Closing rolls back an incomplete transaction if schema creation failed.
      await client.end();
    }
  }

  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "3000"], {
    stdio: "inherit",
    env: process.env,
  });
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("error", () => {
    console.error("[cms] Unable to start the web server.");
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal === "SIGTERM" ? 0 : 1);
  });
} catch (error) {
  // Driver errors may contain connection details; do not log credentials.
  console.error("[cms] Startup failed. Check database availability, schema permissions, and environment configuration.");
  console.error("[cms] Error type:", error.code || error.name);
  process.exitCode = 1;
}
