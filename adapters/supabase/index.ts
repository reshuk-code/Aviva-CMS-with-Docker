import "server-only";

import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AdapterHealth,
  CollectionName,
  CollectionStore,
  CreateInput,
  DatabaseAdapter,
  KeyValueStore,
  UpdateInput,
} from "@/lib/database/adapter";
import type {
  BaseRecord,
  FilterCondition,
  Paginated,
  QuerySpec,
} from "@/types/common";
import type { ProviderCredentials } from "@/types/connections";

import {
  createSupabaseAdminClient,
  readSupabaseConfig,
  type SupabaseConfig,
} from "./client";
import { columnFor, toRecord, toRow, type Row } from "./mapping";

/**
 * Supabase (Postgres) adapter.
 *
 * Storage shape — a deliberate tradeoff, documented in docs/ARCHITECTURE.md:
 *
 *   id uuid, slug text, status text, created_at, updated_at, data jsonb
 *
 * Promoting the two columns the CMS filters on constantly (slug, status) keeps
 * the common queries index-backed, while `data` lets content models gain
 * fields without a migration. The cost is that filtering or sorting on a field
 * inside `data` compares text, not native types — see NUMERIC SORTING below.
 *
 * Run `adapters/supabase/schema.sql` against your project once before use.
 *
 * TODO(phase-4): row level security policies for multi-tenant deployments.
 * TODO(phase-4): promote price/duration to real columns for tour filtering.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- PostgREST builder generics */
type Builder = PostgrestFilterBuilder<any, any, any, any, any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

function applyCondition(builder: Builder, condition: FilterCondition): Builder {
  const column = columnFor(condition.field);
  const value = condition.value;

  switch (condition.op) {
    case "eq":
      return builder.eq(column, value);
    case "ne":
      return builder.neq(column, value);
    case "in":
      return builder.in(column, (value as unknown[]) ?? []);
    case "lt":
      return builder.lt(column, value);
    case "lte":
      return builder.lte(column, value);
    case "gt":
      return builder.gt(column, value);
    case "gte":
      return builder.gte(column, value);
    case "contains":
      return builder.ilike(column, `%${String(value)}%`);
    default:
      return builder;
  }
}

function applyQuery(builder: Builder, query?: QuerySpec): Builder {
  let result = builder;

  for (const condition of query?.where ?? []) {
    result = applyCondition(result, condition);
  }

  if (query?.search?.term.trim()) {
    const term = query.search.term.trim().replace(/[%,()]/g, " ");
    const clauses = query.search.fields
      .map((field) => `${columnFor(field)}.ilike.%${term}%`)
      .join(",");
    if (clauses) result = result.or(clauses);
  }

  for (const sort of query?.sort ?? []) {
    // NUMERIC SORTING: jsonb values sort as text. Sort on a promoted column
    // when ordering matters numerically, or promote the field in schema.sql.
    result = result.order(columnFor(sort.field), {
      ascending: sort.direction === "asc",
    });
  }

  if (query?.limit) {
    const offset = query.offset ?? 0;
    result = result.range(offset, offset + query.limit - 1);
  }

  return result;
}

function fail(operation: string, error: { message: string }): never {
  throw new Error(`Supabase ${operation} failed: ${error.message}`);
}

class SupabaseCollection<T extends BaseRecord> implements CollectionStore<T> {
  constructor(
    private readonly name: CollectionName,
    private readonly client: SupabaseClient,
    private readonly prefix: string,
  ) {}

  private table() {
    return this.client.from(`${this.prefix}${this.name}`);
  }

  async list(query?: QuerySpec): Promise<Paginated<T>> {
    const builder = applyQuery(
      this.table().select("*", { count: "exact" }) as unknown as Builder,
      query,
    );
    const { data, error, count } = await builder;
    if (error) fail("list", error);

    const total = count ?? 0;
    const perPage = query?.limit ?? Math.max(total, 1);
    const offset = query?.offset ?? 0;

    return {
      items: ((data ?? []) as Row[]).map((row) => toRecord<T>(row)),
      total,
      page: Math.floor(offset / perPage) + 1,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    };
  }

  async findMany(query?: QuerySpec): Promise<T[]> {
    const builder = applyQuery(
      this.table().select("*") as unknown as Builder,
      query,
    );
    const { data, error } = await builder;
    if (error) fail("findMany", error);
    return ((data ?? []) as Row[]).map((row) => toRecord<T>(row));
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.table()
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail("findById", error);
    return data ? toRecord<T>(data as Row) : null;
  }

  async findOne(query: QuerySpec): Promise<T | null> {
    const [record] = await this.findMany({ ...query, limit: 1 });
    return record ?? null;
  }

  async count(query?: QuerySpec): Promise<number> {
    const builder = applyQuery(
      this.table().select("id", { count: "exact", head: true }) as unknown as Builder,
      { ...query, limit: undefined, offset: undefined, sort: undefined },
    );
    const { error, count } = await builder;
    if (error) fail("count", error);
    return count ?? 0;
  }

  async create(input: CreateInput<T>): Promise<T> {
    const now = new Date().toISOString();
    const row = toRow(input as Record<string, unknown>);

    const { data, error } = await this.table()
      .insert({ ...row, created_at: now, updated_at: now })
      .select("*")
      .single();
    if (error) fail("create", error);
    return toRecord<T>(data as Row);
  }

  async update(id: string, input: UpdateInput<T>): Promise<T | null> {
    // Merge into the existing row so a partial update does not drop jsonb keys.
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...(input as object) } as Record<string, unknown>;
    const row = toRow(merged);

    const { data, error } = await this.table()
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) fail("update", error);
    return data ? toRecord<T>(data as Row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { error, count } = await this.table()
      .delete({ count: "exact" })
      .eq("id", id);
    if (error) fail("delete", error);
    return (count ?? 0) > 0;
  }
}

function createKv(client: SupabaseClient, prefix: string): KeyValueStore {
  const table = () => client.from(`${prefix}kv`);

  return {
    async get<T>(key: string): Promise<T | null> {
      const { data, error } = await table()
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) fail("kv.get", error);
      return (data?.value as T | undefined) ?? null;
    },

    async set<T>(key: string, value: T): Promise<void> {
      const { error } = await table().upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      if (error) fail("kv.set", error);
    },

    async delete(key: string): Promise<void> {
      const { error } = await table().delete().eq("key", key);
      if (error) fail("kv.delete", error);
    },
  };
}

export function createSupabaseAdapter(
  credentials: ProviderCredentials,
): DatabaseAdapter {
  let config: SupabaseConfig | null = null;
  let client: SupabaseClient | null = null;
  const collections = new Map<string, CollectionStore<BaseRecord>>();

  function connect(): { client: SupabaseClient; config: SupabaseConfig } {
    config ??= readSupabaseConfig(credentials);
    client ??= createSupabaseAdminClient(config);
    return { client, config };
  }

  return {
    provider: "supabase",

    async init() {
      // Fails fast with an actionable message if credentials are missing.
      connect();
    },

    collection<T extends BaseRecord>(name: CollectionName): CollectionStore<T> {
      let store = collections.get(name);
      if (!store) {
        const { client: c, config: cfg } = connect();
        store = new SupabaseCollection<BaseRecord>(name, c, cfg.tablePrefix);
        collections.set(name, store);
      }
      return store as unknown as CollectionStore<T>;
    },

    get kv() {
      const { client: c, config: cfg } = connect();
      return createKv(c, cfg.tablePrefix);
    },

    async health(): Promise<AdapterHealth> {
      try {
        const { client: c, config: cfg } = connect();
        const table = `${cfg.tablePrefix}pages`;
        const { error } = await c.from(table).select("id", {
          count: "exact",
          head: true,
        });

        if (error) {
          return {
            ok: false,
            provider: "supabase",
            message: `Connected, but querying ${table} failed: ${error.message}. Have you run adapters/supabase/schema.sql?`,
          };
        }

        return {
          ok: true,
          provider: "supabase",
          message: "Connected.",
          details: { tablePrefix: cfg.tablePrefix, project: cfg.url },
        };
      } catch (error) {
        return {
          ok: false,
          provider: "supabase",
          message: error instanceof Error ? error.message : "Unknown error.",
        };
      }
    },
  };
}
