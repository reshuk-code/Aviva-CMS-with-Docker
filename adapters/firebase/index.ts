import "server-only";

import {
  AdapterNotConfiguredError,
  type AdapterHealth,
  type CollectionName,
  type CollectionStore,
  type DatabaseAdapter,
  type KeyValueStore,
} from "@/lib/database/adapter";
import type { BaseRecord } from "@/types/common";

/**
 * Firebase / Firestore adapter — STATUS: NOT IMPLEMENTED.
 *
 * This file exists so the provider is a first-class, typed slot in the
 * registry rather than a special case bolted on later. Every method throws a
 * clear error; nothing here pretends to work. Scheduled for Phase 4
 * (docs/ROADMAP.md).
 *
 * Implementation notes for whoever picks this up
 * ----------------------------------------------
 * - Use `firebase-admin/firestore` on the server. The client SDK cannot be
 *   trusted for CMS writes because authorisation must be server-side (§17).
 * - Firestore is the least capable of the three backends for this contract:
 *     * No case-insensitive `contains`. `QuerySpec.search` cannot be pushed
 *       down. Either denormalise a lowercase search field per document, or
 *       front it with a search service. Do NOT silently fetch-and-filter a
 *       whole collection in memory.
 *     * Inequality filters are limited to a single field per query, so a
 *       multi-condition `where` may need a composite index or a redesign.
 *     * `count()` is a separate aggregation query.
 * - Because of the above, this adapter should reject queries it cannot serve
 *   faithfully instead of returning quietly wrong results.
 */
const NOT_IMPLEMENTED =
  "The Firebase adapter is not implemented yet. Use `database: \"supabase\"` " +
  "or `\"local\"` in cms.config.ts. See docs/ROADMAP.md (Phase 4).";

function unimplemented(): never {
  throw new AdapterNotConfiguredError("firebase", NOT_IMPLEMENTED);
}

function createUnimplementedCollection<
  T extends BaseRecord,
>(): CollectionStore<T> {
  return {
    list: unimplemented,
    findMany: unimplemented,
    findById: unimplemented,
    findOne: unimplemented,
    count: unimplemented,
    create: unimplemented,
    update: unimplemented,
    delete: unimplemented,
  };
}

const kv: KeyValueStore = {
  get: unimplemented,
  set: unimplemented,
  delete: unimplemented,
};

export function createFirebaseAdapter(): DatabaseAdapter {
  return {
    provider: "firebase",

    async init() {
      unimplemented();
    },

    collection<T extends BaseRecord>(_name: CollectionName): CollectionStore<T> {
      void _name;
      return createUnimplementedCollection<T>();
    },

    kv,

    async health(): Promise<AdapterHealth> {
      return {
        ok: false,
        provider: "firebase",
        message: NOT_IMPLEMENTED,
      };
    },
  };
}
