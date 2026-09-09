#!/usr/bin/env node
/**
 * Deletes the local development data (.cms-data/) so the CMS returns to its
 * first-run state. Only touches the local JSON adapter — it never talks to
 * Supabase, MongoDB or Firebase, so it cannot destroy a real database.
 */
import { rm, readdir } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const DATA_DIR = path.join(process.cwd(), ".cms-data");

let files;
try {
  files = await readdir(DATA_DIR);
} catch {
  console.log("Nothing to reset: .cms-data/ does not exist.");
  process.exit(0);
}

console.log(`This deletes ${DATA_DIR} (${files.length} file(s)):`);
for (const file of files) console.log(`  ${file}`);
console.log(
  "\nEvery local page, menu, setting and admin account will be lost.\n" +
    "You will go through /admin/setup again.",
);

if (!process.stdout.isTTY || process.argv.includes("--yes")) {
  if (!process.argv.includes("--yes")) {
    console.log("\nRefusing to delete without a terminal. Re-run with --yes.");
    process.exit(1);
  }
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('\nType "reset" to confirm: ');
  rl.close();
  if (answer.trim() !== "reset") {
    console.log("Cancelled. Nothing was deleted.");
    process.exit(0);
  }
}

await rm(DATA_DIR, { recursive: true, force: true });
console.log("Done. Start the dev server and visit /admin/setup.");
