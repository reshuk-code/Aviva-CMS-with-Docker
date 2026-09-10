import type { Metadata } from "next";
import Link from "next/link";

import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils";

/**
 * Blog index — a hand-written developer route.
 *
 * This route deliberately shadows the CMS page with the slug `/blog`: a page
 * of prose cannot list posts. The CMS page is not wasted, though — it is still
 * where an editor sets this page's title and description, which is exactly
 * what `cmsMetadata: true` in `config/routes.ts` is for. The admin's route
 * inventory shows the pairing so nobody wonders why their page "does nothing".
 *
 * Posts carry bare slugs (`ten-days-in-annapurna`), not paths, so mounting
 * them at `/blog/[slug]` is this project's choice rather than the CMS's.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [managed, site] = await Promise.all([
    cms.pages.getBySlug("/blog"),
    cms.settings.get(),
  ]);

  return generateCmsMetadata({
    title: managed?.title ?? "Journal",
    path: "/blog",
    description:
      managed?.excerpt ?? `Stories, route notes and advice from ${site.siteName}.`,
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const selected = typeof params.category === "string" ? params.category : "";

  const [managed, posts, categories] = await Promise.all([
    cms.pages.getBySlug("/blog"),
    cms.posts.getPublished(selected ? { category: selected } : undefined),
    cms.posts.categories(),
  ]);

  const [lead, ...rest] = posts;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-24">
      <header className="max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Journal
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          {managed?.title ?? "Notes from the trail"}
        </h1>
        {managed?.excerpt ? (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {managed.excerpt}
          </p>
        ) : null}
      </header>

      {categories.length > 0 ? (
        <nav aria-label="Categories" className="mt-10 flex flex-wrap gap-2">
          <CategoryChip href="/blog" active={!selected} label="All" />
          {categories.map((category) => (
            <CategoryChip
              key={category}
              href={`/blog?category=${encodeURIComponent(category)}`}
              active={selected === category}
              label={category}
            />
          ))}
        </nav>
      ) : null}

      {posts.length === 0 ? (
        <p className="mt-16 rounded-card border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
          {selected
            ? `Nothing filed under “${selected}” yet.`
            : "No posts published yet. Write the first one in the admin."}
        </p>
      ) : (
        <div className="mt-12 space-y-12">
          {lead ? <LeadPost post={lead} /> : null}

          {rest.length > 0 ? (
            <ul className="grid gap-x-8 gap-y-10 border-t border-border pt-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <li key={post.id}>
                  <PostCard post={post} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-foreground px-3.5 py-1.5 text-sm font-medium text-background"
          : "rounded-full border border-border px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

type PostSummary = Awaited<ReturnType<typeof cms.posts.getPublished>>[number];

/** The most recent post, given more room than the rest. */
function LeadPost({ post }: { post: PostSummary }) {
  return (
    <article className="group grid gap-8 md:grid-cols-2 md:items-center">
      <Link
        href={`/blog/${post.slug}`}
        className="block overflow-hidden rounded-card bg-muted shadow-[var(--shadow-card)] dark:border dark:border-border"
      >
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featuredImage}
            alt=""
            loading="lazy"
            className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="aspect-[16/10] w-full" />
        )}
      </Link>

      <div>
        <PostMeta post={post} />
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          <Link href={`/blog/${post.slug}`} className="hover:underline underline-offset-4">
            {post.title}
          </Link>
        </h2>
        {post.excerpt ? (
          <p className="mt-3 leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
        <Link
          href={`/blog/${post.slug}`}
          className="mt-5 inline-block text-sm font-medium underline-offset-4 hover:underline"
        >
          Read the post →
        </Link>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: PostSummary }) {
  return (
    <article className="group">
      <Link
        href={`/blog/${post.slug}`}
        className="block overflow-hidden rounded-card bg-muted shadow-[var(--shadow-card)] dark:border dark:border-border"
      >
        {post.featuredImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featuredImage}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="aspect-[4/3] w-full" />
        )}
      </Link>

      <div className="mt-4">
        <PostMeta post={post} />
        <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight">
          <Link href={`/blog/${post.slug}`} className="hover:underline underline-offset-4">
            {post.title}
          </Link>
        </h3>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/** Category · date · reading time, skipping whatever the post does not have. */
function PostMeta({ post }: { post: PostSummary }) {
  const bits = [
    post.category,
    post.publishedAt ? formatDate(post.publishedAt) : null,
    post.readingMinutes ? `${post.readingMinutes} min read` : null,
  ].filter(Boolean);

  if (bits.length === 0) return null;

  return (
    <p className="text-xs uppercase tracking-wider text-muted-foreground">
      {bits.join(" · ")}
    </p>
  );
}
