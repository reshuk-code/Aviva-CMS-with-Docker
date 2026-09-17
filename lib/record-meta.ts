import type { ContentRecord } from "@/types/common";

import { formatDateTime } from "./utils";

/**
 * The line under a record's title in the admin: where it stands, and when.
 *
 * "Last updated" alone answered the wrong question. An editor opening a trip
 * wants to know whether it is live and since when — a record saved an hour ago
 * may have been published last March, and the two dates are rarely the same.
 *
 * `publishedAt` carries two meanings and the wording has to follow, or a
 * scheduled post reads as though it is already live: for a published record it
 * is when it went out, and for a scheduled one it is when it will.
 */
export function describeRecord(
  record: Pick<ContentRecord, "status" | "publishedAt" | "updatedAt">,
): string {
  const updated = `Last updated ${formatDateTime(record.updatedAt)}`;

  switch (record.status) {
    case "published":
      // A record published before this field existed has no date to show, so
      // it says only that it is live rather than inventing one.
      return record.publishedAt
        ? `Published ${formatDateTime(record.publishedAt)} · ${updated}`
        : `Published · ${updated}`;

    case "scheduled":
      return record.publishedAt
        ? `Publishes ${formatDateTime(record.publishedAt)} · ${updated}`
        : `Scheduled · ${updated}`;

    case "trash":
      return `In trash · ${updated}`;

    default:
      return `Draft · ${updated}`;
  }
}
