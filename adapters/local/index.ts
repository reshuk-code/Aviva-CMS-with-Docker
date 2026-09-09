import "server-only";

import { randomUUID } from "node:crypto";

import type {
  AdapterHealth,
  CollectionName,
  CollectionStore,
  CreateInput,
  DatabaseAdapter,
  KeyValueStore,
  UpdateInput,
} from "@/lib/database/adapter";
import { applyFilters, paginate } from "@/lib/database/query";
import type { BaseRecord, Paginated, QuerySpec } from "@/types/common";

import { dataDirStats, getDataDir, mutate, readJson } from "./store";

/**
 * Local JSON-file adapter.
 *
 * Purpose: zero-configuration development, demos and prototyping. Every record
 * lives in `.cms-data/<collection>.json`.
 *
 * NOT FOR PRODUCTION. There is no cross-process locking, no indexes, and every
 * query loads the whole collection into memory. Serverless hosts give each
 * instance an ephemeral filesystem, so writes there are lost without warning.
 * Set `database: "supabase"` in cms.config.ts before deploying.
 */
class LocalCollection<T extends BaseRecord> implements CollectionStore<T> {
  constructor(private readonly name: string) {}

  private read(): Promise<T[]> {
    return readJson<T[]>(this.name, []);
  }

  async list(query?: QuerySpec): Promise<Paginated<T>> {
    return paginate(await this.read(), query);
  }

  async findMany(query?: QuerySpec): Promise<T[]> {
    const filtered = applyFilters(await this.read(), query);
    const offset = query?.offset ?? 0;
    return query?.limit
      ? filtered.slice(offset, offset + query.limit)
      : filtered.slice(offset);
  }

  async findById(id: string): Promise<T | null> {
    const records = await this.read();
    return records.find((record) => record.id === id) ?? null;
  }

  async findOne(query: QuerySpec): Promise<T | null> {
    return applyFilters(await this.read(), query)[0] ?? null;
  }

  async count(query?: QuerySpec): Promise<number> {
    return applyFilters(await this.read(), query).length;
  }

  create(data: CreateInput<T>): Promise<T> {
    const now = new Date().toISOString();
    return mutate<T[], T>(this.name, [], (records) => {
      const record = {
        ...(data as object),
        id: data.id ?? randomUUID(),
        createdAt: now,
        updatedAt: now,
      } as T;
      return { next: [...records, record], result: record };
    });
  }

  update(id: string, data: UpdateInput<T>): Promise<T | null> {
    return mutate<T[], T | null>(this.name, [], (records) => {
      const index = records.findIndex((record) => record.id === id);
      if (index === -1) return { next: records, result: null };

      const updated = {
        ...records[index],
        ...(data as object),
        id,
        createdAt: records[index].createdAt,
        updatedAt: new Date().toISOString(),
      } as T;

      const next = [...records];
      next[index] = updated;
      return { next, result: updated };
    });
  }

  delete(id: string): Promise<boolean> {
    return mutate<T[], boolean>(this.name, [], (records) => {
      const next = records.filter((record) => record.id !== id);
      return { next, result: next.length !== records.length };
    });
  }
}

const kv: KeyValueStore = {
  async get<T>(key: string): Promise<T | null> {
    const all = await readJson<Record<string, unknown>>("_kv", {});
    return (all[key] as T | undefined) ?? null;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await mutate<Record<string, unknown>, void>("_kv", {}, (current) => ({
      next: { ...current, [key]: value },
      result: undefined,
    }));
  },

  async delete(key: string): Promise<void> {
    await mutate<Record<string, unknown>, void>("_kv", {}, (current) => {
      const next = { ...current };
      delete next[key];
      return { next, result: undefined };
    });
  },
};

export function createLocalAdapter(): DatabaseAdapter {
  const collections = new Map<string, CollectionStore<BaseRecord>>();

  return {
    provider: "local",

    async init() {
      // Nothing to connect to; .cms-data/ is created lazily on first write.
    },

    collection<T extends BaseRecord>(name: CollectionName): CollectionStore<T> {
      let store = collections.get(name);
      if (!store) {
        store = new LocalCollection<BaseRecord>(name);
        collections.set(name, store);
      }
      return store as unknown as CollectionStore<T>;
    },

    kv,

    async health(): Promise<AdapterHealth> {
      const stats = await dataDirStats();
      return {
        ok: true,
        provider: "local",
        message: stats.exists
          ? "Local JSON store ready. Development only."
          : "Local JSON store will be created on first write. Development only.",
        details: {
          directory: getDataDir(),
          collections: stats.files,
          productionReady: false,
        },
      };
    },
  };
}
