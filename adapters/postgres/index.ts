import "server-only";

import { Pool, type QueryResultRow } from "pg";

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
import {
  assertSafeField,
  sqlColumnFor,
  toRecord,
  toRow,
  type Row,
} from "@/adapters/supabase/mapping";
import type {
  BaseRecord,
  FilterCondition,
  Paginated,
  QuerySpec,
} from "@/types/common";
import type { ProviderCredentials } from "@/types/connections";

interface PostgresConfig {
  connectionString: string;
  tablePrefix: string;
}

function readConfig(credentials: ProviderCredentials): PostgresConfig {
  const connectionString = credentials.connectionString?.trim();

  if (!connectionString) {
    throw new AdapterNotConfiguredError(
      "postgres",
      "POSTGRES_DATABASE_URL is not set in .env.local.",
    );
  }
  if (!/^postgres(ql)?:\/\//i.test(connectionString)) {
    throw new AdapterNotConfiguredError(
      "postgres",
      "the connection string should start with postgresql://.",
    );
  }

  return {
    connectionString,
    tablePrefix: credentials.tablePrefix?.trim() || "cms_",
  };
}

class Params {
  readonly values: unknown[] = [];

  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

function conditionSql(condition: FilterCondition, params: Params): string {
  assertSafeField(condition.field);
  const column = sqlColumnFor(condition.field);
  const value = condition.value;

  switch (condition.op) {
    case "eq":
      return `${column} = ${params.add(String(value))}`;
    case "ne":
      return `${column} IS DISTINCT FROM ${params.add(String(value))}`;
    case "in": {
      const list = Array.isArray(value) ? value : [value];
      if (list.length === 0) return "false";
      return `${column} = ANY(${params.add(list.map(String))})`;
    }
    case "lt":
      return `${column} < ${params.add(String(value))}`;
    case "lte":
      return `${column} <= ${params.add(String(value))}`;
    case "gt":
      return `${column} > ${params.add(String(value))}`;
    case "gte":
      return `${column} >= ${params.add(String(value))}`;
    case "contains":
      return `${column} ILIKE ${params.add(`%${String(value)}%`)}`;
    default:
      return "true";
  }
}

function whereSql(query: QuerySpec | undefined, params: Params): string {
  const clauses: string[] = [];

  for (const condition of query?.where ?? []) {
    clauses.push(conditionSql(condition, params));
  }

  if (query?.search?.term.trim()) {
    const term = `%${query.search.term.trim()}%`;
    const parts = query.search.fields.map((field) => {
      assertSafeField(field);
      return `${sqlColumnFor(field)} ILIKE ${params.add(term)}`;
    });
    if (parts.length) clauses.push(`(${parts.join(" OR ")})`);
  }

  return clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
}

function orderSql(query?: QuerySpec): string {
  if (!query?.sort?.length) return "";

  const parts = query.sort.map((spec) => {
    assertSafeField(spec.field);
    return `${sqlColumnFor(spec.field)} ${spec.direction === "desc" ? "DESC" : "ASC"}`;
  });

  return `ORDER BY ${parts.join(", ")}`;
}

class PostgresCollection<T extends BaseRecord> implements CollectionStore<T> {
  constructor(
    private readonly table: string,
    private readonly pool: Pool,
  ) {}

  private async run(text: string, values: unknown[]): Promise<QueryResultRow[]> {
    const result = await this.pool.query(text, values);
    return result.rows;
  }

  async findMany(query?: QuerySpec): Promise<T[]> {
    const params = new Params();
    const where = whereSql(query, params);
    const order = orderSql(query);

    let text = `SELECT * FROM ${this.table} ${where} ${order}`;
    if (query?.limit) text += ` LIMIT ${params.add(query.limit)}`;
    if (query?.offset) text += ` OFFSET ${params.add(query.offset)}`;

    const rows = await this.run(text, params.values);
    return rows.map((row) => toRecord<T>(row as unknown as Row));
  }

  async list(query?: QuerySpec): Promise<Paginated<T>> {
    const [items, total] = await Promise.all([
      this.findMany(query),
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

  async findById(id: string): Promise<T | null> {
    const rows = await this.run(
      `SELECT * FROM ${this.table} WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toRecord<T>(rows[0] as unknown as Row) : null;
  }

  async findOne(query: QuerySpec): Promise<T | null> {
    const [record] = await this.findMany({ ...query, limit: 1 });
    return record ?? null;
  }

  async count(query?: QuerySpec): Promise<number> {
    const params = new Params();
    const where = whereSql(query, params);
    const rows = await this.run(
      `SELECT COUNT(*)::int AS count FROM ${this.table} ${where}`,
      params.values,
    );
    return Number(rows[0]?.count ?? 0);
  }

  async create(input: CreateInput<T>): Promise<T> {
    const row = toRow(input as Record<string, unknown>);
    const now = new Date().toISOString();

    const rows = await this.run(
      `INSERT INTO ${this.table} (id, slug, status, created_at, updated_at, data)
       VALUES (COALESCE($1, gen_random_uuid()), $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [
        row.id ?? null,
        row.slug ?? null,
        row.status ?? null,
        now,
        now,
        JSON.stringify(row.data ?? {}),
      ],
    );

    return toRecord<T>(rows[0] as unknown as Row);
  }

  async update(id: string, input: UpdateInput<T>): Promise<T | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const merged = { ...current, ...(input as object) } as Record<string, unknown>;
    const row = toRow(merged);

    const rows = await this.run(
      `UPDATE ${this.table}
          SET slug = $2, status = $3, updated_at = $4, data = $5::jsonb
        WHERE id = $1
        RETURNING *`,
      [
        id,
        row.slug ?? null,
        row.status ?? null,
        new Date().toISOString(),
        JSON.stringify(row.data ?? {}),
      ],
    );

    return rows[0] ? toRecord<T>(rows[0] as unknown as Row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const rows = await this.run(
      `DELETE FROM ${this.table} WHERE id = $1 RETURNING id`,
      [id],
    );
    return rows.length > 0;
  }
}

function createKv(pool: Pool, prefix: string): KeyValueStore {
  const table = `${prefix}kv`;

  return {
    async get<T>(key: string): Promise<T | null> {
      const result = await pool.query<{ value: T }>(
        `SELECT value FROM ${table} WHERE key = $1 LIMIT 1`,
        [key],
      );
      return result.rows[0]?.value ?? null;
    },

    async set<T>(key: string, value: T): Promise<void> {
      await pool.query(
        `INSERT INTO ${table} (key, value, updated_at)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [key, JSON.stringify(value), new Date().toISOString()],
      );
    },

    async delete(key: string): Promise<void> {
      await pool.query(`DELETE FROM ${table} WHERE key = $1`, [key]);
    },
  };
}

export function createPostgresAdapter(
  credentials: ProviderCredentials,
): DatabaseAdapter {
  let config: PostgresConfig | null = null;
  let pool: Pool | null = null;
  const collections = new Map<string, CollectionStore<BaseRecord>>();

  function connect(): { pool: Pool; config: PostgresConfig } {
    config ??= readConfig(credentials);
    pool ??= new Pool({ connectionString: config.connectionString });
    return { pool, config };
  }

  return {
    provider: "postgres",

    async init() {
      const { pool: p } = connect();
      await p.query("SELECT 1");
    },

    collection<T extends BaseRecord>(name: CollectionName): CollectionStore<T> {
      let store = collections.get(name);
      if (!store) {
        const { pool: p, config: cfg } = connect();
        store = new PostgresCollection<BaseRecord>(`${cfg.tablePrefix}${name}`, p);
        collections.set(name, store);
      }
      return store as unknown as CollectionStore<T>;
    },

    get kv() {
      const { pool: p, config: cfg } = connect();
      return createKv(p, cfg.tablePrefix);
    },

    async health(): Promise<AdapterHealth> {
      try {
        const { pool: p, config: cfg } = connect();
        const table = `${cfg.tablePrefix}pages`;
        const result = await p.query<{ count: number }>(
          `SELECT COUNT(*)::int AS count FROM ${table}`,
        );

        return {
          ok: true,
          provider: "postgres",
          message: "Connected to Postgres.",
          details: {
            tablePrefix: cfg.tablePrefix,
            pages: Number(result.rows[0]?.count ?? 0),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        return {
          ok: false,
          provider: "postgres",
          message: /relation .* does not exist/i.test(message)
            ? `Connected, but the CMS tables are missing: ${message}. Run adapters/postgres/schema.sql.`
            : message,
        };
      }
    },
  };
}
