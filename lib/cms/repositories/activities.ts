import "server-only";

import { ConflictError, NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import type { ActivityInputParsed } from "@/schemas/activity";
import { slugify } from "@/schemas/common";
import type { ListOptions, Paginated } from "@/types/common";
import type { Activity } from "@/types/content";

import {
  buildListQuery,
  isPubliclyVisible,
  PUBLIC_STATUS_FILTER,
  resolvePublication,
} from "./base";
import type { WriteContext } from "./pages";

const SEARCH_FIELDS = ["name", "slug", "description", "icon"];

/** Ceiling for the unpaginated scans. See the note on `media.folders()`. */
const FACET_SCAN_LIMIT = 2000;

async function collection() {
  return (await getDatabase()).collection<Activity>("activities");
}

/**
 * Activities repository.
 *
 * Not to be confused with `./activity`, which is the audit log. This is the
 * content type: the things a traveller *does* — trekking, rafting, a jungle
 * safari — that tours are tagged with and that usually get a landing page of
 * their own.
 *
 * The model is small on purpose. An activity has no coordinates and no season
 * because those belong to the places and packages it applies to; duplicating
 * them here would give two answers to the same question.
 *
 * Slugs are bare, like destinations: the project decides whether they live at
 * `/activities/trekking` or `/things-to-do/trekking`.
 */
export const activities = {
  async list(options?: ListOptions): Promise<Paginated<Activity>> {
    const store = await collection();
    return store.list(buildListQuery(options, SEARCH_FIELDS));
  },

  async get(id: string): Promise<Activity | null> {
    return (await collection()).findById(id);
  },

  /** Frontend lookup. Drafts and not-yet-due scheduled records return null. */
  async getBySlug(slug: string): Promise<Activity | null> {
    const found = await this.getBySlugIncludingDrafts(slug);
    return found && isPubliclyVisible(found) ? found : null;
  },

  /** Preview/admin lookup: ignores publication state. */
  async getBySlugIncludingDrafts(slug: string): Promise<Activity | null> {
    const store = await collection();
    return store.findOne({
      where: [{ field: "slug", op: "eq", value: slugify(slug) }],
    });
  },

  /** Published activities in display order — the listing page. */
  async getPublished(options?: ListOptions): Promise<Activity[]> {
    const store = await collection();

    const candidates = await store.findMany({
      where: [PUBLIC_STATUS_FILTER],
      sort: [
        { field: options?.sort ?? "order", direction: options?.order ?? "asc" },
      ],
    });

    const visible = candidates.filter((record) => isPubliclyVisible(record));
    return options?.perPage ? visible.slice(0, options.perPage) : visible;
  },

  async count(options?: ListOptions): Promise<number> {
    const store = await collection();
    return store.count(buildListQuery(options, SEARCH_FIELDS));
  },

  /** Icon names in use, for the editor's datalist. */
  async icons(): Promise<string[]> {
    const store = await collection();
    const all = await store.findMany({
      where: [{ field: "status", op: "ne", value: "trash" }],
      limit: FACET_SCAN_LIMIT,
    });

    const names = new Set<string>();
    for (const record of all) {
      if (record.icon) names.add(record.icon);
    }

    return [...names].sort((a, b) => a.localeCompare(b));
  },

  /** Minimal projection, for the activity picker in the tour editor. */
  async options(): Promise<{ id: string; name: string; slug: string }[]> {
    const store = await collection();
    const all = await store.findMany({
      where: [{ field: "status", op: "ne", value: "trash" }],
      sort: [{ field: "name", direction: "asc" }],
      limit: FACET_SCAN_LIMIT,
    });

    return all.map(({ id, name, slug }) => ({ id, name, slug }));
  },

  /**
   * Resolves the ids a tour stores, in the order the tour stores them.
   *
   * Ids that no longer exist are dropped rather than reported: nothing
   * rewrites a tour's `activityIds` when an activity is deleted, so a stale id
   * is expected, not a fault. A caller that needs to know about the gap can
   * compare lengths.
   */
  async byIds(ids: string[]): Promise<Activity[]> {
    if (ids.length === 0) return [];

    const store = await collection();
    const found = await store.findMany({
      where: [{ field: "id", op: "in", value: ids }],
      limit: FACET_SCAN_LIMIT,
    });

    const byId = new Map(found.map((record) => [record.id, record]));
    return ids
      .map((id) => byId.get(id))
      .filter((record): record is Activity => record !== undefined);
  },

  async create(
    input: ActivityInputParsed,
    ctx: WriteContext,
  ): Promise<Activity> {
    const store = await collection();
    await assertSlugFree(input.slug, null);

    return store.create({
      ...fields(input),
      publishedAt: resolvePublication(input.status, input.publishedAt, null),
      updatedBy: ctx.userId,
    });
  },

  async update(
    id: string,
    input: ActivityInputParsed,
    ctx: WriteContext,
  ): Promise<Activity> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Activity");

    await assertSlugFree(input.slug, id);

    const updated = await store.update(id, {
      ...fields(input),
      publishedAt: resolvePublication(
        input.status,
        input.publishedAt,
        existing.publishedAt,
      ),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Activity");
    return updated;
  },

  async setStatus(
    id: string,
    status: Activity["status"],
    ctx: WriteContext,
  ): Promise<Activity> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Activity");

    const updated = await store.update(id, {
      status,
      publishedAt: resolvePublication(status, null, existing.publishedAt),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Activity");
    return updated;
  },

  async trash(id: string, ctx: WriteContext): Promise<Activity> {
    return this.setStatus(id, "trash", ctx);
  },

  async delete(id: string): Promise<boolean> {
    return (await collection()).delete(id);
  },

  async duplicate(id: string, ctx: WriteContext): Promise<Activity> {
    const store = await collection();
    const source = await store.findById(id);
    if (!source) throw new NotFoundError("Activity");

    return store.create({
      ...source,
      id: undefined,
      name: `${source.name} (copy)`,
      slug: await findFreeSlug(source.slug),
      status: "draft",
      publishedAt: null,
      updatedBy: ctx.userId,
    } as Omit<Activity, "id" | "createdAt" | "updatedAt"> & { id?: string });
  },
};

/** The fields the form owns, shared by create and update. */
function fields(input: ActivityInputParsed) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    icon: input.icon,
    featuredImage: input.featuredImage,
    order: input.order,
    status: input.status,
    seo: input.seo,
  };
}

async function assertSlugFree(slug: string, ignoreId: string | null) {
  const store = await collection();
  const existing = await store.findOne({
    where: [{ field: "slug", op: "eq", value: slug }],
  });

  if (existing && existing.id !== ignoreId) {
    throw new ConflictError(
      `The slug "${slug}" is already used by "${existing.name}".`,
      "slug",
    );
  }
}

async function findFreeSlug(base: string): Promise<string> {
  const store = await collection();

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = slugify(`${base}-${suffix}`);
    const taken = await store.findOne({
      where: [{ field: "slug", op: "eq", value: candidate }],
    });
    if (!taken) return candidate;
  }

  return slugify(`${base}-${Date.now()}`);
}
