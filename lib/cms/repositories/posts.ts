import "server-only";

import { ConflictError, NotFoundError } from "@/lib/cms/errors";
import { getDatabase } from "@/lib/database";
import { richDocToPlainText, toRichDoc } from "@/lib/rich-text";
import { applyFilters, applySort, paginate } from "@/lib/database/query";
import { slugify } from "@/schemas/common";
import type { PostInputParsed } from "@/schemas/post";
import type { FilterCondition, ListOptions, Paginated } from "@/types/common";
import type { Post } from "@/types/content";

import {
  buildListQuery,
  isPubliclyVisible,
  PUBLIC_STATUS_FILTER,
  resolvePublication,
} from "./base";
import type { WriteContext } from "./pages";

const SEARCH_FIELDS = ["title", "slug", "excerpt", "category"];

/** Ceiling for the category/tag scan. See the note on `media.folders()`. */
const FACET_SCAN_LIMIT = 2000;

/** Words per minute. The number every blog platform quietly agrees on. */
const READING_SPEED = 200;

async function collection() {
  return (await getDatabase()).collection<Post>("posts");
}

export interface PostListOptions extends ListOptions {
  category?: string;
  tag?: string;
}

/** A post write also records who gets the byline. */
export interface PostWriteContext extends WriteContext {
  /** Display name for `authorName`, captured at write time. */
  authorName?: string | null;
}

/**
 * Blog repository.
 *
 * Mirrors `pages` — same statuses, same publication windows, same slug
 * uniqueness — with two differences that matter:
 *
 * - Slugs are bare ("annapurna-in-october"), not paths. A post has no route of
 *   its own; the developer mounts it wherever the site wants it, typically
 *   `app/blog/[slug]`. Storing "/annapurna-in-october" would bake a URL layout
 *   into the content.
 * - Categories and tags are strings on the post rather than their own
 *   collections. A travel blog has a dozen categories that change twice a
 *   year; two more tables, two more admin screens and a referential-integrity
 *   story would cost far more than they return. `categories()` and `tags()`
 *   derive the facets from the posts themselves.
 */
export const posts = {
  /** Admin listing: every status, paginated, searchable, facet-filtered. */
  async list(options?: PostListOptions): Promise<Paginated<Post>> {
    const store = await collection();
    const query = buildListQuery(options, SEARCH_FIELDS);

    const where: FilterCondition[] = [...(query.where ?? [])];
    if (options?.category) {
      where.push({ field: "category", op: "eq", value: options.category });
    }

    const spec = { ...query, where: where.length ? where : undefined };

    // Tag membership is the one filter the adapter contract cannot express
    // identically everywhere: `contains` means "the array includes this" in
    // the local engine and "substring" once it becomes SQL, where the tag
    // "trek" would also match a post tagged "trekking". Filtering here keeps
    // it meaning exactly one thing on every backend.
    if (options?.tag) {
      const tag = options.tag;
      const all = await store.findMany({ limit: FACET_SCAN_LIMIT });
      const matching = applyFilters(all, spec).filter((post) =>
        (post.tags ?? []).includes(tag),
      );
      return paginate(applySort(matching, spec.sort), spec);
    }

    return store.list(spec);
  },

  async get(id: string): Promise<Post | null> {
    return (await collection()).findById(id);
  },

  /** Frontend lookup. Drafts and not-yet-due scheduled posts return null. */
  async getBySlug(slug: string): Promise<Post | null> {
    const post = await this.getBySlugIncludingDrafts(slug);
    return post && isPubliclyVisible(post) ? post : null;
  },

  /** Preview/admin lookup: ignores publication state. */
  async getBySlugIncludingDrafts(slug: string): Promise<Post | null> {
    const store = await collection();
    return store.findOne({
      where: [{ field: "slug", op: "eq", value: slugify(slug) }],
    });
  },

  /**
   * Published posts, newest first — the blog index.
   *
   * Scheduled posts are filtered in memory for the same reason as pages: the
   * adapter contract cannot express "published OR (scheduled AND due)".
   */
  async getPublished(options?: PostListOptions): Promise<Post[]> {
    const store = await collection();

    const where: FilterCondition[] = [PUBLIC_STATUS_FILTER];
    if (options?.category) {
      where.push({ field: "category", op: "eq", value: options.category });
    }

    const candidates = await store.findMany({
      where,
      sort: [
        {
          field: options?.sort ?? "publishedAt",
          direction: options?.order ?? "desc",
        },
      ],
    });

    const tag = options?.tag;
    const visible = candidates.filter(
      (post) =>
        isPubliclyVisible(post) && (!tag || (post.tags ?? []).includes(tag)),
    );

    return options?.perPage ? visible.slice(0, options.perPage) : visible;
  },

  async count(options?: PostListOptions): Promise<number> {
    const store = await collection();
    return store.count(buildListQuery(options, SEARCH_FIELDS));
  },

  /** Categories in use, for the filter dropdown and the editor's datalist. */
  async categories(): Promise<string[]> {
    const all = await scan();
    const names = new Set<string>();
    for (const post of all) {
      if (post.category) names.add(post.category);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  },

  /** Tags in use, with how many posts carry each. */
  async tags(): Promise<{ name: string; count: number }[]> {
    const all = await scan();
    const counts = new Map<string, number>();

    for (const post of all) {
      for (const tag of post.tags ?? []) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  },

  async create(input: PostInputParsed, ctx: PostWriteContext): Promise<Post> {
    const store = await collection();
    await assertSlugFree(input.slug, null);

    return store.create({
      ...fields(input),
      publishedAt: resolvePublication(input.status, input.publishedAt, null),
      updatedBy: ctx.userId,
      authorId: input.authorId ?? ctx.userId,
      authorName: ctx.authorName ?? null,
    });
  },

  async update(
    id: string,
    input: PostInputParsed,
    ctx: PostWriteContext,
  ): Promise<Post> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Post");

    await assertSlugFree(input.slug, id);

    const updated = await store.update(id, {
      ...fields(input),
      publishedAt: resolvePublication(
        input.status,
        input.publishedAt,
        existing.publishedAt,
      ),
      updatedBy: ctx.userId,
      authorId: input.authorId,
      // The byline belongs to whoever is credited, not to whoever last saved,
      // so the caller resolves the name for `input.authorId`.
      authorName: ctx.authorName ?? null,
    });

    if (!updated) throw new NotFoundError("Post");
    return updated;
  },

  async setStatus(
    id: string,
    status: Post["status"],
    ctx: WriteContext,
  ): Promise<Post> {
    const store = await collection();
    const existing = await store.findById(id);
    if (!existing) throw new NotFoundError("Post");

    const updated = await store.update(id, {
      status,
      publishedAt: resolvePublication(status, null, existing.publishedAt),
      updatedBy: ctx.userId,
    });

    if (!updated) throw new NotFoundError("Post");
    return updated;
  },

  /** Moves a post to the trash. Reversible; `delete` is not. */
  async trash(id: string, ctx: WriteContext): Promise<Post> {
    return this.setStatus(id, "trash", ctx);
  },

  async delete(id: string): Promise<boolean> {
    return (await collection()).delete(id);
  },

  /** Copies a post as a draft with a free slug. */
  async duplicate(id: string, ctx: WriteContext): Promise<Post> {
    const store = await collection();
    const source = await store.findById(id);
    if (!source) throw new NotFoundError("Post");

    return store.create({
      ...source,
      id: undefined,
      title: `${source.title} (copy)`,
      slug: await findFreeSlug(source.slug),
      status: "draft",
      publishedAt: null,
      updatedBy: ctx.userId,
    } as Omit<Post, "id" | "createdAt" | "updatedAt"> & { id?: string });
  },
};

/** The fields a post form owns, shared by create and update. */
function fields(input: PostInputParsed) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    content: input.content,
    body: input.body,
    featuredImage: input.featuredImage,
    category: input.category,
    tags: input.tags,
    status: input.status,
    readingMinutes: readingMinutes(input.content),
    seo: input.seo,
  };
}

/** Minutes at a typical reading speed, floored at one for any real content. */
function readingMinutes(content: string): number | null {
  // Counted from the document's words, not the stored string: the editor
  // stores a serialised document, and counting that would bill the reader for
  // every `{"type":"paragraph"}` in it.
  const words = richDocToPlainText(toRichDoc(content))
    .split(/\s+/)
    .filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / READING_SPEED));
}

/**
 * Every post that is not in the trash, for deriving facets.
 *
 * Unpaginated by design and capped: a blog large enough to hit the cap needs
 * real taxonomy tables, and that is a Phase 4 conversation.
 */
async function scan(): Promise<Post[]> {
  const store = await collection();
  return store.findMany({
    where: [{ field: "status", op: "ne", value: "trash" }],
    limit: FACET_SCAN_LIMIT,
  });
}

async function assertSlugFree(slug: string, ignoreId: string | null) {
  const store = await collection();
  const existing = await store.findOne({
    where: [{ field: "slug", op: "eq", value: slug }],
  });

  if (existing && existing.id !== ignoreId) {
    throw new ConflictError(
      `The slug "${slug}" is already used by "${existing.title}".`,
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
