#!/usr/bin/env node
/**
 * Fills the local CMS with a complete demo site: regions, destinations,
 * activities, trips, posts, pages, testimonials, FAQs and enquiries, each with
 * real photographs downloaded into `public/uploads/`.
 *
 * This is the counterpart to `cms:reset`. Reset empties the CMS so you can see
 * first-run; seed fills it so you can see a finished site. Both touch only the
 * local JSON adapter and never talk to Supabase, Neon, Mongo or Firebase.
 *
 * Two things it deliberately leaves alone: `users.json` and `.session-secret`.
 * Overwriting either would lock you out of the admin you are trying to look at.
 *
 * Usage:  npm run cms:seed         (asks first)
 *         npm run cms:seed -- --yes
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import { IMAGES } from "./seed-images.mjs";
import { fetchImages, stableId } from "./seed-media.mjs";
import { buildContent } from "./seed-content.mjs";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".cms-data");
const UPLOAD_ROOT = path.join(ROOT, "public", "uploads");

/** Written in this order; `media` first because everything else points at it. */
const COLLECTIONS = [
  "media",
  "regions",
  "destinations",
  "activities",
  "tours",
  "posts",
  "pages",
  "testimonials",
  "faqs",
  "enquiries",
  "menus",
];

/* ------------------------------------------------------------------ guards */

/**
 * Reads a CMS setting the way the app does — environment first, then the
 * fallback in `cms.config.ts`.
 *
 * The config file is TypeScript, so this greps it rather than importing it.
 * Ugly but contained: the only two values read are string literals, and being
 * wrong fails safe, because the seeder refuses rather than writing.
 */
async function resolveSetting(envKey, configKey) {
  const fromEnv = process.env[envKey] ?? (await readEnvFile())[envKey];
  if (fromEnv) return fromEnv;

  const config = await readFile(path.join(ROOT, "cms.config.ts"), "utf8");
  return new RegExp(`^\\s*${configKey}:\\s*"([^"]+)"`, "m").exec(config)?.[1];
}

async function readEnvFile() {
  const values = {};
  for (const file of [".env.local", ".env"]) {
    let text;
    try {
      text = await readFile(path.join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      // First file wins, so .env.local overrides .env as Next.js loads them.
      values[match[1]] ??= match[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return values;
}

async function confirm(fileCount) {
  console.log(
    `\nThis rewrites ${fileCount} content file(s) in .cms-data/ (backed up first)` +
      `\nand downloads ${IMAGES.length} photographs into public/uploads/.` +
      "\n\nYour admin accounts and your login session are left untouched.",
  );

  if (process.argv.includes("--yes")) return true;
  if (!process.stdout.isTTY) {
    console.log("\nRefusing to run without a terminal. Re-run with --yes.");
    return false;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('\nType "seed" to confirm: ');
  rl.close();
  return answer.trim() === "seed";
}

/* ------------------------------------------------------------------ output */

async function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(DATA_DIR, `.seed-backup-${stamp}`);
  let saved = 0;

  for (const name of COLLECTIONS) {
    const source = path.join(DATA_DIR, `${name}.json`);
    if (!existsSync(source)) continue;
    if (saved === 0) await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${name}.json`), await readFile(source));
    saved += 1;
  }

  return { dir, saved };
}

async function writeCollection(name, records) {
  await writeFile(
    path.join(DATA_DIR, `${name}.json`),
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
  console.log(`  ${String(records.length).padStart(3)}  ${name}`);
}

/**
 * The admin account the seeded content is attributed to.
 *
 * Content has to point at a user that exists — a dangling `updatedBy` shows as
 * a blank author in the admin — so this reads the accounts already set up
 * rather than inventing one.
 */
async function resolveAuthor() {
  let users;
  try {
    users = JSON.parse(await readFile(path.join(DATA_DIR, "users.json"), "utf8"));
  } catch {
    return null;
  }

  const active = users.filter((user) => user.active !== false);
  return active.find((user) => user.role === "super_admin") ?? active[0] ?? null;
}

/* -------------------------------------------------------------------- main */

const database = await resolveSetting("CMS_DATABASE", "database");
const storage = await resolveSetting("CMS_STORAGE", "storage");

if (database !== "local" || storage !== "local") {
  console.error(
    "Refusing to seed: this writes .cms-data/ and public/uploads/, which only\n" +
      `the local adapters read. Yours are database="${database}", storage="${storage}".\n\n` +
      "Set CMS_DATABASE=local and CMS_STORAGE=local to seed a development copy.",
  );
  process.exit(1);
}

if (!existsSync(DATA_DIR)) {
  console.error(
    "No .cms-data/ yet. Start the dev server, complete /admin/setup to create\n" +
      "an account, then run this again.",
  );
  process.exit(1);
}

const author = await resolveAuthor();
if (!author) {
  console.error(
    "No admin account found in .cms-data/users.json. Complete /admin/setup first\n" +
      "so the seeded content has an author to belong to.",
  );
  process.exit(1);
}

const existing = (await readdir(DATA_DIR)).filter((file) =>
  COLLECTIONS.some((name) => file === `${name}.json`),
);

if (!(await confirm(existing.length))) {
  console.log("Cancelled. Nothing was written.");
  process.exit(0);
}

const { dir: backupDir, saved } = await backup();
if (saved) console.log(`\nBacked up ${saved} file(s) to ${path.basename(backupDir)}/`);

console.log(`\nPhotographs (${IMAGES.length}):`);
const now = new Date().toISOString();
const media = await fetchImages(IMAGES, UPLOAD_ROOT, author.id, now);

const content = buildContent({ media, author, stableId });

console.log("\nWritten:");
await writeCollection("media", [...media.values()]);
for (const name of COLLECTIONS.slice(1)) {
  await writeCollection(name, content[name]);
}

// Settings live in the key/value store rather than a collection. Merged, not
// replaced: a developer's own siteUrl or analytics ids should survive a reseed.
const kvPath = path.join(DATA_DIR, "_kv.json");
const kv = existsSync(kvPath) ? JSON.parse(await readFile(kvPath, "utf8")) : {};
kv.site_settings = { ...(kv.site_settings ?? {}), ...content.settings };
await writeFile(kvPath, `${JSON.stringify(kv, null, 2)}\n`, "utf8");
console.log("       site settings");

console.log(
  "\nDone. Open http://localhost:3000 for the site," +
    `\nor http://localhost:3000/admin and sign in as ${author.email}.`,
);
