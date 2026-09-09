import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { CmsPageRenderer } from "@/components/frontend/cms-page-renderer";
import { PreviewBanner } from "@/components/frontend/preview-banner";
import { cms } from "@/lib/cms";
import { getCmsConfig } from "@/lib/cms/config";
import { generateCmsMetadata } from "@/lib/seo/metadata";
import type { CmsPage } from "@/types/page";

/**
 * Generic renderer for CMS-managed pages (§7).
 *
 * Next.js matches static segments before a catch-all, so a hand-written route
 * such as `app/about/page.tsx` always wins over a CMS page with the slug
 * `/about`. That is the precedence the brief asks for, and it needs no code:
 * it is how the router already works. The admin route inventory flags the
 * shadowed CMS page so an editor is told why theirs is not showing.
 *
 * Requests that match neither a route nor a CMS page fall through to the
 * redirect table before 404ing.
 */
async function resolvePage(slugParts: string[]): Promise<CmsPage | null> {
  const path = `/${slugParts.join("/")}`;

  const { isEnabled } = await draftMode();
  const page = isEnabled
    ? await cms.pages.getBySlugIncludingDrafts(path)
    : await cms.pages.getBySlug(path);

  return page;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolvePage(slug);

  if (!page) return { title: "Not found" };

  return generateCmsMetadata({
    title: page.title,
    path: page.slug,
    description: page.excerpt,
    image: page.featuredImage,
    seo: page.seo,
  });
}

export default async function CmsCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  if (!getCmsConfig().frontend.catchAllRoutes) notFound();

  const { slug } = await params;
  const path = `/${slug.join("/")}`;
  const page = await resolvePage(slug);

  if (!page) {
    // Nothing serves this path. Honour an editor-managed redirect if one
    // exists, otherwise 404.
    const rule = await cms.redirects.match(path);
    if (rule) {
      if (rule.permanent) permanentRedirect(rule.destination);
      redirect(rule.destination);
    }
    notFound();
  }

  const { isEnabled } = await draftMode();

  return (
    <>
      {isEnabled && page.status !== "published" ? (
        <PreviewBanner status={page.status} path={page.slug} />
      ) : null}
      <CmsPageRenderer page={page} />
    </>
  );
}
