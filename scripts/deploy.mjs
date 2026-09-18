import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { fileURLToPath } from "node:url";

// Builds the image here and streams it to the VPS over SSH. No registry is
// involved on purpose: the image, the database and the uploads never leave
// machines the company controls, and nobody's personal Docker Hub account ends
// up holding production.
//
//   npm run deploy                     build package.json's version and ship it
//   npm run deploy -- --first          allow creating a brand-new stack
//   npm run deploy -- --rollback 0.1.3 switch back to an image already on the VPS

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const first = args.includes("--first");
const rollbackAt = args.indexOf("--rollback");
const rollback = rollbackAt >= 0 ? args[rollbackAt + 1] : null;
if (rollbackAt >= 0 && !rollback) fail("--rollback needs a version, e.g. --rollback 0.1.3");

try {
  process.loadEnvFile(new URL("../.env.deploy", import.meta.url));
} catch {
  fail("Missing .env.deploy. Copy .env.deploy.example and fill in the server details.");
}
const { DEPLOY_HOST, DEPLOY_USER, DEPLOY_DIR, DEPLOY_PORT = "22", DEPLOY_PLATFORM = "linux/amd64" } = process.env;
if (!DEPLOY_HOST || !DEPLOY_USER || !DEPLOY_DIR) fail("Set DEPLOY_HOST, DEPLOY_USER and DEPLOY_DIR in .env.deploy.");

const version = rollback ?? JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const image = `aviva-cms:${version}`;
const ssh = ["-p", DEPLOY_PORT, `${DEPLOY_USER}@${DEPLOY_HOST}`];

function fail(message) {
  console.error(`[deploy] ${message}`);
  process.exit(1);
}

function quote(value) {
  return `'${value.replace(/'/g, `'\''`)}'`;
}

// Windows checkouts may carry CRLF, which bash and YAML on the VPS reject.
function lf(file) {
  return Readable.from([readFileSync(new URL(`../${file}`, import.meta.url), "utf8").replace(/\r\n/g, "\n")]);
}

async function remote(command, input) {
  const child = spawn("ssh", [...ssh, command], { cwd: root, stdio: ["pipe", "inherit", "inherit"] });
  const exited = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => resolve(code));
  });
  await pipeline(input, child.stdin);
  const code = await exited;
  if (code !== 0) fail(`Remote step failed (exit ${code}): ${command}`);
}

if (!rollback) {
  if (spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout?.trim()) {
    console.warn("[deploy] Warning: uncommitted changes are included in this build.");
  }
  console.log(`[deploy] Building ${image} for ${DEPLOY_PLATFORM}…`);
  const build = spawnSync("docker", ["build", "--platform", DEPLOY_PLATFORM, "-t", image, "."], { cwd: root, stdio: "inherit" });
  if (build.error || build.status !== 0) fail("docker build failed. Is Docker Desktop running?");

  console.log(`[deploy] Sending ${image} to ${DEPLOY_HOST}…`);
  const save = spawn("docker", ["save", image], { cwd: root, stdio: ["ignore", "pipe", "inherit"] });
  const saved = new Promise((resolve) => save.on("exit", resolve));
  // docker load accepts a gzipped archive directly; compression cuts the upload several-fold.
  await remote("docker load", save.stdout.pipe(createGzip()));
  if ((await saved) !== 0) fail("docker save failed.");
}

console.log("[deploy] Uploading compose file…");
await remote(`cat > ${quote(`${DEPLOY_DIR}/docker-compose.yml.next`)}`, lf("docker-compose.xcloud.yml"));

console.log(`[deploy] Switching the site to ${image}…`);
await remote(`bash -s -- ${quote(DEPLOY_DIR)} ${quote(image)} ${first ? "1" : "0"}`, lf("scripts/server-deploy.sh"));
console.log(`[deploy] Done. ${image} is live.`);
