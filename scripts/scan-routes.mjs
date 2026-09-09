#!/usr/bin/env node
/**
 * Development-time route drift check.
 *
 * Walks `app/` for `page.tsx` files, derives the URL each one serves, and
 * compares that against `config/routes.ts`. Reports routes that exist in the
 * app but are not declared, so the admin route inventory stays honest.
 *
 * This runs only when a developer invokes it (`npm run cms:routes`). Nothing
 * at runtime touches the filesystem — see lib/cms/routes.ts for why.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const APP_DIR = path.join(process.cwd(), "app");
const ROUTES_FILE = path.join(process.cwd(), "config", "routes.ts");

/** Segments that shape the URL tree without appearing in the URL. */
function isGroupSegment(segment) {
  return segment.startsWith("(") && segment.endsWith(")");
}

function isPrivateSegment(segment) {
  return segment.startsWith("_") || segment.startsWith("@");
}

async function findPageFiles(dir, segments = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const found = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (isPrivateSegment(entry.name)) continue;
      const nextSegments = isGroupSegment(entry.name)
        ? segments
        : [...segments, entry.name];
      found.push(...(await findPageFiles(path.join(dir, entry.name), nextSegments)));
      continue;
    }

    if (/^page\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      found.push({ segments, file: path.join(dir, entry.name) });
    }
  }

  return found;
}

function toUrlPath(segments) {
  if (segments.length === 0) return "/";

  const parts = segments.map((segment) => {
    if (segment.startsWith("[...") || segment.startsWith("[[...")) return "*";
    if (segment.startsWith("[")) return `:${segment.replace(/[[\]]/g, "")}`;
    return segment;
  });

  return `/${parts.join("/")}`;
}

function normalise(routePath) {
  const withSlash = routePath.startsWith("/") ? routePath : `/${routePath}`;
  const trimmed = withSlash.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/**
 * Reads declared paths out of config/routes.ts textually. Importing the file
 * would need a TypeScript loader; a regex over `path: "..."` is enough for a
 * dev-time reminder and keeps this script dependency-free.
 */
async function readDeclaredPaths() {
  try {
    const source = await readFile(ROUTES_FILE, "utf8");
    return new Set(
      [...source.matchAll(/path:\s*["'`]([^"'`]+)["'`]/g)].map((match) =>
        normalise(match[1]),
      ),
    );
  } catch {
    return new Set();
  }
}

const pageFiles = await findPageFiles(APP_DIR);
const declared = await readDeclaredPaths();

const appRoutes = pageFiles
  .map(({ segments, file }) => ({
    path: toUrlPath(segments),
    file: path.relative(process.cwd(), file),
  }))
  .filter(({ path: routePath }) => {
    // The admin, the API and the CMS catch-all are not developer routes.
    if (routePath === "/admin" || routePath.startsWith("/admin/")) return false;
    if (routePath.startsWith("/api")) return false;
    if (routePath.includes("*")) return false;
    return true;
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const missing = appRoutes.filter(({ path: routePath }) => !declared.has(routePath));

console.log(`\nRoutes found in app/: ${appRoutes.length}`);
for (const route of appRoutes) {
  const mark = declared.has(route.path) ? "declared" : "NOT DECLARED";
  console.log(`  ${route.path.padEnd(28)} ${mark.padEnd(14)} ${route.file}`);
}

if (missing.length === 0) {
  console.log("\nEvery route in app/ is declared in config/routes.ts.\n");
  process.exit(0);
}

console.log(
  `\n${missing.length} route(s) are not declared in config/routes.ts.` +
    "\nAdd them so they appear in the admin route inventory:\n",
);
for (const route of missing) {
  console.log(`  { path: "${route.path}", cmsMetadata: true },`);
}
console.log("");

// Informational, not a failure: declaring routes is optional by design.
process.exit(0);
