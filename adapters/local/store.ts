import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Tiny JSON-file persistence used by the local development adapter.
 *
 * Guarantees it does provide: atomic replacement (write temp + rename) and
 * serialised writes within a single Node process.
 *
 * Guarantees it does NOT provide: cross-process locking, transactions, or
 * anything resembling production durability. It exists so that a fresh clone
 * runs `npm run dev` and gets a working /admin with no credentials.
 */
const DATA_DIR = path.join(process.cwd(), ".cms-data");

/** Per-file promise chain, so concurrent writes queue instead of clobbering. */
const writeQueues = new Map<string, Promise<unknown>>();

function filePath(name: string): string {
  return path.join(DATA_DIR, `${name}.json`);
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath(name), "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return fallback;
    if (error instanceof SyntaxError) {
      throw new Error(
        `.cms-data/${name}.json contains invalid JSON. Fix or delete the file.`,
      );
    }
    throw error;
  }
}

async function writeJsonNow<T>(name: string, value: T): Promise<void> {
  await ensureDir();
  const target = filePath(name);
  const temp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value, null, 2), "utf8");
  await fs.rename(temp, target);
}

/** Serialises writes per file and resolves once this write has landed. */
export function writeJson<T>(name: string, value: T): Promise<void> {
  const previous = writeQueues.get(name) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => writeJsonNow(name, value));
  writeQueues.set(name, next);
  return next;
}

/**
 * Read-modify-write inside the same per-file queue, so two concurrent updates
 * cannot both read the pre-update state.
 */
export function mutate<T, R>(
  name: string,
  fallback: T,
  mutator: (current: T) => { next: T; result: R },
): Promise<R> {
  const previous = writeQueues.get(name) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(async (): Promise<R> => {
      const current = await readJson<T>(name, fallback);
      const { next: updated, result } = mutator(current);
      await writeJsonNow(name, updated);
      return result;
    });
  writeQueues.set(name, next);
  return next as Promise<R>;
}

export function getDataDir(): string {
  return DATA_DIR;
}

export async function dataDirStats(): Promise<{
  exists: boolean;
  files: number;
}> {
  try {
    const entries = await fs.readdir(DATA_DIR);
    return {
      exists: true,
      files: entries.filter((file) => file.endsWith(".json")).length,
    };
  } catch {
    return { exists: false, files: 0 };
  }
}
