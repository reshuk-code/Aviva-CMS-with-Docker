import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const execute = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const project = `cms-smoke-${Date.now()}`;
const port = process.env.CMS_TEST_PORT || "16000";
const uploadsDir = await mkdtemp(path.join(tmpdir(), "cms-smoke-uploads-"));
const env = {
  ...process.env,
  CMS_IMAGE: process.env.CMS_TEST_IMAGE || "trekking-cms:local",
  APP_PORT: port,
  ADMINER_PORT: String(Number(port) + 1),
  CMS_UPLOADS_DIR: uploadsDir,
  POSTGRES_DB: "cms",
  POSTGRES_USER: "cms",
  POSTGRES_PASSWORD: `${randomBytes(24).toString("hex")}@%:/?#`,
  CMS_SESSION_SECRET: randomBytes(32).toString("hex"),
  NEXT_PUBLIC_SITE_URL: `http://localhost:${port}`,
};
const compose = ["compose", "-p", project, "-f", "docker-compose.xcloud.yml"];
async function docker(...args) {
  return execute("docker", args, { cwd: root, env, maxBuffer: 4 * 1024 * 1024 });
}
async function ready() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/admin/setup`, { signal: AbortSignal.timeout(2000) });
      if (response.status === 200) return;
    } catch { /* The app may still be starting. */ }
    await delay(1000);
  }
  throw new Error("CMS setup did not respond within 60 attempts.");
}
async function checkUpload() {
  const response = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/uploads/docker-smoke.png`);
  assert.equal(response.status, 200, "A file added after startup must be publicly readable");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL("../public/brand/logo-mark.png", import.meta.url)));
}

try {
  console.log("Starting isolated Docker smoke test:", project);
  await docker(...compose, "up", "-d", "--wait", "--wait-timeout", "90");
  await ready();
  console.log("PASS: startup, PostgreSQL initialization, and /admin/setup");
  const app = (await docker(...compose, "ps", "-q", "app")).stdout.trim();
  await docker("exec", app, "test", "-w", "/app/public/uploads");
  await docker("cp", "public/brand/logo-mark.png", `${app}:/app/public/uploads/docker-smoke.png`);
  await checkUpload();
  assert.ok((await stat(path.join(uploadsDir, "docker-smoke.png"))).isFile(), "Uploads must land in the host folder");
  console.log("PASS: writable host uploads folder and newly added image delivery");
  const imageUrl = `${env.NEXT_PUBLIC_SITE_URL}/uploads/docker-smoke.png`;
  const head = await fetch(imageUrl, { method: "HEAD" });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-type"), "image/png");
  const bytes = await readFile(new URL("../public/brand/logo-mark.png", import.meta.url));
  for (const [range, expected] of [["bytes=0-15", bytes.subarray(0, 16)], ["bytes=-16", bytes.subarray(-16)]]) {
    const partial = await fetch(imageUrl, { headers: { Range: range } });
    assert.equal(partial.status, 206);
    assert.deepEqual(Buffer.from(await partial.arrayBuffer()), expected);
  }
  const invalid = await fetch(imageUrl, { headers: { Range: "bytes=999999999-" } });
  assert.equal(invalid.status, 416);
  const missing = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/uploads/not-present.png`);
  assert.equal(missing.status, 404);
  const traversal = await fetch(`${env.NEXT_PUBLIC_SITE_URL}/uploads/..%2f..%2fpackage.json`);
  assert.equal(traversal.status, 404);
  console.log("PASS: HEAD, byte ranges for video seeking, missing files, and traversal rejection");
  await docker(...compose, "exec", "-T", "postgres", "psql", "-U", "cms", "-d", "cms", "-v", "ON_ERROR_STOP=1", "-c",
    "INSERT INTO cms_kv(key, value) VALUES ('docker-smoke', '{\"ok\":true}');");
  await docker(...compose, "restart");
  await ready();
  await checkUpload();
  const record = await docker(...compose, "exec", "-T", "postgres", "psql", "-U", "cms", "-d", "cms", "-tAc",
    "SELECT value->>'ok' FROM cms_kv WHERE key='docker-smoke';");
  assert.equal(record.stdout.trim(), "true");
  console.log("PASS: database and uploaded image survive container restart");
} catch (error) {
  console.error(error.message);
  const logs = await docker(...compose, "logs", "--tail=40", "app").catch(() => null);
  if (logs) console.error(logs.stdout);
  process.exitCode = 1;
} finally {
  // Delete only the uniquely named test stack and its disposable data. The
  // container owns the upload files, so it has to empty the folder itself.
  await docker(...compose, "exec", "-T", "app", "sh", "-c", "rm -rf /app/public/uploads/*").catch(() => null);
  await docker(...compose, "down", "-v");
  await rm(uploadsDir, { recursive: true, force: true }).catch(() => null);
  console.log("Removed temporary smoke-test containers and volumes.");
}
