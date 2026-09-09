import type { Metadata } from "next";
import Link from "next/link";

import { cms } from "@/lib/cms";
import { generateCmsMetadata } from "@/lib/seo/metadata";

/**
 * Home page — a hand-written developer route.
 *
 * It is declared in `config/routes.ts` with `cmsMetadata: true`, so an editor
 * can manage its title and description from the admin (create a CMS page with
 * the slug "/") while the developer keeps this markup. That is the split the
 * platform is built around: CMS owns content, developer owns presentation.
 *
 * Replace everything below on a real client project.
 *
 * Rendering: static with a revalidation window. The admin calls
 * `revalidatePath` whenever content changes, so edits appear immediately
 * without every visitor request hitting the database.
 */
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const managed = await cms.pages.getBySlug("/");
  const site = await cms.settings.get();

  return generateCmsMetadata({
    title: managed?.title ?? site.siteName,
    path: "/",
    description: managed?.excerpt ?? site.tagline,
    image: managed?.featuredImage ?? null,
    seo: managed?.seo ?? null,
  });
}

export default async function HomePage() {
  const [site, publishedPages] = await Promise.all([
    cms.settings.get(),
    cms.pages.getPublished(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-20">
      <section className="max-w-2xl space-y-4">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {site.tagline || "Travel CMS"}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">
          {site.siteName}
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          This is your public site. Build it with ordinary Next.js pages and
          components, and pull content from the CMS with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
            cms.pages.getBySlug()
          </code>
          .
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/admin"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background"
          >
            Open the admin
          </Link>
        </div>
      </section>

      <section className="mt-16 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Published pages
        </h2>

        {publishedPages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pages have been published yet. Create one in the admin and it
            will appear at its slug straight away.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {publishedPages.map((page) => (
              <li key={page.id}>
                <Link
                  href={page.slug}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">{page.title}</span>
                  <code className="text-xs text-muted-foreground">
                    {page.slug}
                  </code>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
