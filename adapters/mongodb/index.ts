import "server-only";

import { randomUUID } from "node:crypto";

import {
  AdapterNotConfiguredError,
  type AdapterHealth,
  type CollectionName,
  type CollectionStore,
  type CreateInput,
  type DatabaseAdapter,
  type KeyValueStore,
  type UpdateInput,
} from "@/lib/database/adapter";
import type {
  BaseRecord,
  FilterCondition,
  Paginated,
  QuerySpec,
} from "@/types/common";
import type { ProviderCredentials } from "@/types/connections";

/**
 * MongoDB adapter — STATUS: structurally complete, NOT YET VERIFIED against a
 * live cluster. Phase 4 work (docs/ROADMAP.md). Do not ship a client on this
 * adapter without testing it first.
 *
 * The `mongodb` driver is intentionally NOT a dependency of this template:
 * most projects use Supabase, and two unused database drivers in every client
 * repo is not a trade worth making. Install it when you need this adapter:
 *
 *   npm install mongodb
 *
 * Documents keep the CMS `id` as the Mongo `_id` (a string, not an ObjectId)
 * so ids are portable across adapters and safe to put in URLs.
 *
 * TODO(phase-4): create indexes on slug/status/updatedAt at init().
 * TODO(phase-4): verify the text-search path against a real deployment.
 */

/* The narrow slice of the driver this adapter uses. Declared locally so the
 * file type-checks without `mongodb` installed. */
interface MongoFindCursor {
  sort(spec: Record<string, 1 | -1>): MongoFindCursor;
  skip(n: number): MongoFindCursor;
  limit(n: number): MongoFindCursor;
  toArray(): Promise<Record<string, unknown>[]>;
}

interface MongoCollection {
  find(filter: Record<string, unknown>): MongoFindCursor;
  findOne(filter: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  insertOne(doc: Record<string, unknown>): Promise<unknown>;
  findOneAndUpdate(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options: { returnDocument: "after" },
  ): Promise<Record<string, unknown> | null>;
  updateOne(
    filter: Record<string, unknown>,
    update: Record<string, unknown>,
    options?: { upsert?: boolean },
  ): Promise<unknown>;
  deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount?: number }>;
}

interface MongoDb {
  collection(name: string): MongoCollection;
  command(cmd: Record<string, unknown>): Promise<unknown>;
}

interface MongoClientLike {
  connect(): Promise<MongoClientLike>;
  db(name?: string): MongoDb;
}

/**
 * Connections are cached per URI, so re-resolving the adapter after a settings
 * change does not open a second pool to the same cluster.
 */
const pools = new Map<string, Promise<MongoDb>>();

function getDbFactory(credentials: ProviderCredentials) {
  return async function getDb(): Promise<MongoDb> {
    const uri = credentials.uri?.trim();
    if (!uri) {
      throw new AdapterNotConfiguredError(
        "mongodb",
        "MONGODB_URI is not set in .env.local.",
      );
    }

    const cached = pools.get(uri);
    if (cached) return cached;

    const opened = (async () => {
      let MongoClient: new (uri: string) => MongoClientLike;
      try {
        /* `as string` widens the specifier so TypeScript stops resolving it at
         * build time. `mongodb` is an optional driver: on a clean install it is
         * absent and a bare literal fails the build with TS2307 — which only
         * shows up in CI, because a stray `mongodb` anywhere up the directory
         * tree makes it resolve on a dev machine. The cast erases, so the
         * emitted call still carries the literal for the bundler. */
        ({ MongoClient } = (await import(
          /* webpackIgnore: true */ "mongodb" as string
        )) as unknown as { MongoClient: new (uri: string) => MongoClientLike });
      } catch {
        throw new AdapterNotConfiguredError(
          "mongodb",
          "the `mongodb` package is not installed. Run: npm install mongodb",
        );
      }

      const client = await new MongoClient(uri).connect();
      return client.db(credentials.database?.trim() || undefined);
    })();

    pools.set(uri, opened);
    return opened;
  };
}

type GetDb = () => Promise<MongoDb>;

/** CMS field path -> Mongo field path. `id` is stored as `_id`. */
function fieldFor(field: string): string {
  return field === "id" ? "_id" : field;
}

function toFilter(query?: QuerySpec): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  for (const condition of query?.where ?? []) {
    Object.assign(filter, conditionToFilter(condition));
  }

  if (query?.search?.term.trim()) {
    const escaped = query.search.term
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = query.search.fields.map((field) => ({
      [fieldFor(field)]: { $regex: escaped, $options: "i" },
    }));
  }

  return filter;
}

function conditionToFilter(condition: FilterCondition): Record<string, unknown> {
  const field = fieldFor(condition.field);
  const value = condition.value;

  switch (condition.op) {
    case "eq":
      return { [field]: value };
    case "ne":
      return { [field]: { $ne: value } };
    case "in":
      return { [field]: { $in: (value as unknown[]) ?? [] } };
    case "lt":
      return { [field]: { $lt: value } };
    case "lte":
      return { [field]: { $lte: value } };
    case "gt":
      return { [field]: { $gt: value } };
    case "gte":
      return { [field]: { $gte: value } };
    case "contains":
      return Array.isArray(value)
        ? { [field]: { $all: value } }
        : {
            [field]: {
              $regex: String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              $options: "i",
            },
          };
    default:
      return {};
  }
}

function toSort(query?: QuerySpec): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = {};
  for (const spec of query?.sort ?? []) {
    sort[fieldFor(spec.field)] = spec.direction === "desc" ? -1 : 1;
  }
  return sort;
}

function toRecord<T extends BaseRecord>(doc: Record<string, unknown>): T {
  const { _id, ...rest } = doc;
  return { ...rest, id: String(_id) } as T;
}

class MongoCmsCollection<T extends BaseRecord> implements CollectionStore<T> {
  constructor(
    private readonly name: CollectionName,
    private readonly getDb: GetDb,
  ) {}

  private async col(): Promise<MongoCollection> {
    return (await this.getDb()).collection(`cms_${this.name}`);
  }

  private async run(query?: QuerySpec): Promise<T[]> {
    const col = await this.col();
    let cursor = col.find(toFilter(query));

    const sort = toSort(query);
    if (Object.keys(sort).length) cursor = cursor.sort(sort);
    if (query?.offset) cursor = cursor.skip(query.offset);
    if (query?.limit) cursor = cursor.limit(query.limit);

    return (await cursor.toArray()).map((doc) => toRecord<T>(doc));
  }

  async list(query?: QuerySpec): Promise<Paginated<T>> {
    const [items, total] = await Promise.all([
      this.run(query),
      this.count(query),
    ]);

    const perPage = query?.limit ?? Math.max(total, 1);
    const offset = query?.offset ?? 0;

    return {
      items,
      total,
      page: Math.floor(offset / perPage) + 1,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  findMany(query?: QuerySpec): Promise<T[]> {
    return this.run(query);
  }

  async findById(id: string): Promise<T | null> {
    const doc = await (await this.col()).findOne({ _id: id });
    return doc ? toRecord<T>(doc) : null;
  }

  async findOne(query: QuerySpec): Promise<T | null> {
    const [record] = await this.run({ ...query, limit: 1 });
    return record ?? null;
  }

  async count(query?: QuerySpec): Promise<number> {
    return (await this.col()).countDocuments(toFilter(query));
  }

  async create(input: CreateInput<T>): Promise<T> {
    const now = new Date().toISOString();
    const { id, ...rest } = input as CreateInput<T> & { id?: string };
    const doc = {
      _id: id ?? randomUUID(),
      ...rest,
      createdAt: now,
      updatedAt: now,
    };
    await (await this.col()).insertOne(doc);
    return toRecord<T>(doc);
  }

  async update(id: string, input: UpdateInput<T>): Promise<T | null> {
    const { id: _ignored, createdAt: _created, ...patch } = input as Record<
      string,
      unknown
    >;

    const doc = await (await this.col()).findOneAndUpdate(
      { _id: id },
      { $set: { ...patch, updatedAt: new Date().toISOString() } },
      { returnDocument: "after" },
    );

    return doc ? toRecord<T>(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await (await this.col()).deleteOne({ _id: id });
    return (result.deletedCount ?? 0) > 0;
  }
}

function createKv(getDb: GetDb): KeyValueStore {
  return {
    async get<T>(key: string): Promise<T | null> {
      const doc = await (await getDb()).collection("cms_kv").findOne({ _id: key });
      return (doc?.value as T | undefined) ?? null;
    },

    async set<T>(key: string, value: T): Promise<void> {
      await (await getDb())
        .collection("cms_kv")
        .updateOne(
          { _id: key },
          { $set: { value, updatedAt: new Date().toISOString() } },
          { upsert: true },
        );
    },

    async delete(key: string): Promise<void> {
      await (await getDb()).collection("cms_kv").deleteOne({ _id: key });
    },
  };
}

export function createMongoAdapter(
  credentials: ProviderCredentials,
): DatabaseAdapter {
  const getDb = getDbFactory(credentials);
  const collections = new Map<string, CollectionStore<BaseRecord>>();

  return {
    provider: "mongodb",

    async init() {
      await getDb();
    },

    collection<T extends BaseRecord>(name: CollectionName): CollectionStore<T> {
      let store = collections.get(name);
      if (!store) {
        store = new MongoCmsCollection<BaseRecord>(name, getDb);
        collections.set(name, store);
      }
      return store as unknown as CollectionStore<T>;
    },

    kv: createKv(getDb),

    async health(): Promise<AdapterHealth> {
      try {
        await (await getDb()).command({ ping: 1 });
        return {
          ok: true,
          provider: "mongodb",
          message: "Connected. Adapter is unverified — test before production.",
        };
      } catch (error) {
        return {
          ok: false,
          provider: "mongodb",
          message: error instanceof Error ? error.message : "Unknown error.",
        };
      }
    },
  };
}
