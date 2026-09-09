import "server-only";

import { getDatabase } from "@/lib/database";
import type { BaseRecord } from "@/types/common";

export type ActivityAction =
  | "created"
  | "updated"
  | "published"
  | "unpublished"
  | "trashed"
  | "deleted"
  | "duplicated"
  | "signed_in";

export interface ActivityEntry extends BaseRecord {
  action: ActivityAction;
  /** Collection name, e.g. "pages". Null for account-level events. */
  entityType: string | null;
  entityId: string | null;
  /** Human label captured at write time, so it survives the record's deletion. */
  entityTitle: string;
  userId: string | null;
  userName: string;
}

async function collection() {
  return (await getDatabase()).collection<ActivityEntry>("activity_log");
}

/**
 * Activity log.
 *
 * Feeds the dashboard's "Recent activity" widget and answers "who changed
 * this?" without a full revision history. It is intentionally append-only and
 * lossy: entries are pruned so the log cannot grow without bound.
 *
 * TODO(phase-3): full revisions with restore, which is a different feature.
 */
const MAX_ENTRIES = 200;

export const activity = {
  async record(entry: {
    action: ActivityAction;
    entityType?: string | null;
    entityId?: string | null;
    entityTitle: string;
    userId: string | null;
    userName: string;
  }): Promise<void> {
    const store = await collection();

    await store.create({
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      entityTitle: entry.entityTitle,
      userId: entry.userId,
      userName: entry.userName,
    });

    await prune(MAX_ENTRIES);
  },

  async recent(limit = 10): Promise<ActivityEntry[]> {
    const store = await collection();
    return store.findMany({
      sort: [{ field: "createdAt", direction: "desc" }],
      limit,
    });
  },
};

/** Keeps the log bounded. Best-effort: a failure here must not fail a save. */
async function prune(keep: number): Promise<void> {
  try {
    const store = await collection();
    const total = await store.count();
    if (total <= keep) return;

    const oldest = await store.findMany({
      sort: [{ field: "createdAt", direction: "asc" }],
      limit: total - keep,
    });

    await Promise.all(oldest.map((entry) => store.delete(entry.id)));
  } catch {
    // Non-critical.
  }
}
