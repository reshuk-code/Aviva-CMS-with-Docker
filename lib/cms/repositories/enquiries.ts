import "server-only";

import { NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import type {
  EnquiryInputParsed,
  EnquiryUpdateParsed,
} from "@/schemas/enquiry";
import type { FilterCondition, ListOptions, Paginated } from "@/types/common";
import type { Enquiry, EnquiryStatus } from "@/types/content";

import { buildListQuery } from "./base";
import type { WriteContext } from "./pages";

const SEARCH_FIELDS = ["name", "email", "message", "country", "phone"];

/** Ceiling for the status-count scan. See the note on `media.folders()`. */
const FACET_SCAN_LIMIT = 2000;

async function collection() {
  return (await getDatabase()).collection<Enquiry>("enquiries");
}

export interface EnquiryListOptions extends ListOptions {
  enquiryStatus?: EnquiryStatus;
}

/**
 * Enquiries repository — the inbox behind the contact and booking forms.
 *
 * The one collection whose records are written by the public. Three things
 * follow from that and none of them are optional:
 *
 * - `create` takes only the traveller's own fields. Status and notes are set
 *   here, never accepted from the caller, so a crafted form post cannot file
 *   itself as "converted" or write the operator's notes.
 * - There is no `update` for the message. An enquiry is a record of what
 *   somebody actually sent; editing it would destroy the only copy. Triage
 *   changes `status` and `notes` and nothing else.
 * - It is a `BaseRecord`, not a `ContentRecord`: an enquiry is never
 *   published, so it has no status/publishedAt lifecycle and no public read.
 *   Do not add one — `cms.enquiries` must never be readable from a page.
 */
export const enquiries = {
  async list(options?: EnquiryListOptions): Promise<Paginated<Enquiry>> {
    const store = await collection();

    // The shared helper filters on `status`, which for every other collection
    // means the publication lifecycle. Here it is the triage state, so the
    // list option is named separately and applied by hand.
    const query = buildListQuery(
      { ...options, status: "any" },
      SEARCH_FIELDS,
    );

    const where: FilterCondition[] = [...(query.where ?? [])];
    if (options?.enquiryStatus) {
      where.push({ field: "status", op: "eq", value: options.enquiryStatus });
    }

    return store.list({
      ...query,
      where: where.length ? where : undefined,
      sort: [
        {
          field: options?.sort || "createdAt",
          direction: options?.order ?? "desc",
        },
      ],
    });
  },

  async get(id: string): Promise<Enquiry | null> {
    return (await collection()).findById(id);
  },

  /** How many enquiries sit in each triage state — the inbox tab counts. */
  async statusCounts(): Promise<Record<EnquiryStatus, number>> {
    const store = await collection();
    const all = await store.findMany({ limit: FACET_SCAN_LIMIT });

    const counts = {
      new: 0,
      contacted: 0,
      quoted: 0,
      converted: 0,
      closed: 0,
      spam: 0,
    } satisfies Record<EnquiryStatus, number>;

    for (const record of all) {
      if (record.status in counts) counts[record.status] += 1;
    }

    return counts;
  },

  /**
   * Enquiries received per day for the last `days` days, oldest first.
   *
   * Bucketed here rather than in SQL because the adapter contract has no date
   * grouping — the lowest common denominator across Postgres, Mongo and
   * Firestore does not include it. The window is small and the scan is capped,
   * so the cost is a page-sized read.
   */
  async dailyCounts(
    days = 7,
  ): Promise<{ day: string; label: string; count: number }[]> {
    const store = await collection();
    const all = await store.findMany({ limit: FACET_SCAN_LIMIT });

    const buckets = new Map<string, number>();
    const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const out: { day: string; label: string; count: number }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let back = days - 1; back >= 0; back -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - back);
      const key = localDay(date);
      buckets.set(key, 0);
      out.push({ day: key, label: labels[date.getDay()], count: 0 });
    }

    for (const record of all) {
      // Bucket by LOCAL day, not by the ISO string's UTC date. Slicing the
      // stored timestamp looks equivalent and is not: east of UTC, local
      // midnight is the previous day in UTC, so every bucket was shifted back
      // one and today's enquiries matched nothing. "Last 7 days" means the
      // operator's days.
      const key = localDay(new Date(record.createdAt));
      if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }

    return out.map((entry) => ({ ...entry, count: buckets.get(entry.day) ?? 0 }));
  },

  /**
   * Where enquiries came from, as a share of the total.
   *
   * `source` is whatever the submitting form put there, so this is a report of
   * what the site actually sends rather than a fixed vocabulary. Anything that
   * arrived without one is grouped as "Unknown".
   */
  async sourceSplit(): Promise<{ source: string; count: number; share: number }[]> {
    const store = await collection();
    const all = await store.findMany({ limit: FACET_SCAN_LIMIT });
    if (all.length === 0) return [];

    const counts = new Map<string, number>();
    for (const record of all) {
      const key = record.source?.trim() || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([source, count]) => ({
        source,
        count,
        share: Math.round((count / all.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  },

  /** Unread count for the dashboard badge. */
  async countNew(): Promise<number> {
    const store = await collection();
    return store.count({
      where: [{ field: "status", op: "eq", value: "new" }],
    });
  },

  /**
   * Files a new enquiry. Called from the project's own contact-form action.
   *
   * Everything the caller may set is in `EnquiryInputParsed`; `status` and
   * `notes` are set here so no public payload can reach them.
   */
  async create(input: EnquiryInputParsed): Promise<Enquiry> {
    const store = await collection();

    return store.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
      country: input.country,
      message: input.message,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      travelDate: input.travelDate,
      travellers: input.travellers,
      source: input.source,
      status: "new",
      notes: null,
    });
  },

  /** Triage: the status and the internal notes, never the traveller's words. */
  async triage(
    id: string,
    input: EnquiryUpdateParsed,
    _ctx: WriteContext,
  ): Promise<Enquiry> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Enquiry");

    const updated = await store.update(id, {
      status: input.status,
      notes: input.notes,
    });

    if (!updated) throw new NotFoundError("Enquiry");
    return updated;
  },

  async setStatus(
    id: string,
    status: EnquiryStatus,
    _ctx: WriteContext,
  ): Promise<Enquiry> {
    const store = await collection();
    const updated = await store.update(id, { status });
    if (!updated) throw new NotFoundError("Enquiry");
    return updated;
  },

  async delete(id: string): Promise<boolean> {
    return (await collection()).delete(id);
  },
};

/** Y-M-D in the server's local timezone. See the note in `dailyCounts`. */
function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

