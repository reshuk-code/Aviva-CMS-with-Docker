import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PreviewBanner } from "@/components/frontend/preview-banner";
import { RichText } from "@/components/frontend/rich-text";
import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import { formatDate } from "@/lib/utils";
import type { Post } from "@/types/content";

/**
 * A single blog post.
 *
 * Honours draft mode the same way the CMS catch-all does, so the Preview
 * button in the admin works for posts as well as pages: with draft mode on we
 * look up unpublished records, and the banner tells the editor what visitors
 * can actually see.
 */
export const revalidate = 300;

async function resolvePost(slug: string): Promise<Post | null> {
  const { isEnabled } = await draftMode();
  return isEnabled
    ? cms.posts.getBySlugIncludingDrafts(slug)
    : cms.posts.getBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await resolvePost(slug);

  if (!post) return { title: "Not found" };

  return generateCmsMetadata({
    title: post.title,
    path: `/blog/${post.slug}`,
    description: post.excerpt,
    image: post.featuredImage,
    seo: post.seo,
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await resolvePost(slug);

  if (!post) notFound();

  const { isEnabled: previewing } = await draftMode();

  // Three more posts to read next, this one excluded. Fetching four covers the
  // case where this post is itself among the most recent.
  const more = (await cms.posts.getPublished({ perPage: 4 }))
    .filter((candidate) => candidate.id !== post.id)
    .slice(0, 3);

  const meta = [
    post.authorName,
    post.publishedAt ? formatDate(post.publishedAt) : null,
    post.readingMinutes ? `${post.readingMinutes} min read` : null,
  ].filter(Boolean);

  return (
    <>
      {previewing ? (
        <PreviewBanner status={post.status} path={`/blog/${post.slug}`} />
      ) : null}

      <article className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
        <nav className="mb-8 text-sm">
          <Link
            href="/blog"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← All posts
          </Link>
        </nav>

        <header>
          {post.category ? (
            <Link
              href={`/blog?category=${encodeURIComponent(post.category)}`}
              className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
            >
              {post.category}
            </Link>
          ) : null}

          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {post.title}
          </h1>

          {meta.length > 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {meta.join(" · ")}
            </p>
          ) : null}

          {post.excerpt ? (
            <p className="mt-6 border-l-2 border-border pl-4 text-lg leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        {post.featuredImage ? (
          <figure className="mt-10 overflow-hidden rounded-card bg-muted shadow-[var(--shadow-card)] dark:border dark:border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.featuredImage}
              alt=""
              data-lightbox
              className="aspect-[16/9] w-full object-cover"
            />
          </figure>
        ) : null}

        <div className="mt-10 leading-relaxed [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold">
          <RichText content={post.content} />
        </div>

        {post.tags.length > 0 ? (
          <ul className="mt-12 flex flex-wrap gap-2 border-t border-border pt-8">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <aside className="mt-16 rounded-card bg-surface px-6 py-8 text-center dark:border dark:border-border">
          <p className="text-lg font-medium">Planning something like this?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us your dates and we will put a route together.
          </p>
          <Link
            href="/contact"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            Start planning
          </Link>
        </aside>
      </article>

      {more.length > 0 ? (
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Read next
            </h2>
            <ul className="mt-8 grid gap-8 sm:grid-cols-3">
              {more.map((other) => (
                <li key={other.id}>
                  <Link href={`/blog/${other.slug}`} className="group block">
                    <h3 className="font-semibold leading-snug tracking-tight group-hover:underline underline-offset-4">
                      {other.title}
                    </h3>
                    {other.publishedAt ? (
                      <p className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                        {formatDate(other.publishedAt)}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
