import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { DefaultSeoForm } from "@/app/admin/(dashboard)/seo/default-seo-form";
import { PageHeader } from "@/components/cms/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getCmsConfig } from "@/lib/cms/config";
import { pages } from "@/lib/cms/repositories/pages";
import { settings } from "@/lib/cms/repositories/settings";

export const metadata = { title: "SEO" };

/**
 * SEO overview.
 *
 * Two jobs: edit the site-wide defaults, and show which published pages are
 * missing metadata. The audit is the part that earns its place — it turns
 * "SEO" from an abstract settings screen into a to-do list.
 */
export default async function SeoPage() {
  const session = await requirePermission("seo.read");

  const [site, published] = await Promise.all([
    settings.get(),
    pages.getPublished(),
  ]);

  const config = getCmsConfig();

  const issues = published
    .map((page) => {
      const problems: string[] = [];
      if (!page.seo.title && !page.title) problems.push("no title");
      if (!page.seo.description && !page.excerpt) {
        problems.push("no meta description");
      }
      if (page.seo.robots === "noindex") problems.push("hidden from search");
      return { page, problems };
    })
    .filter((entry) => entry.problems.length > 0);

  const siteUrlMissing = !site.siteUrl || site.siteUrl.includes("localhost");

  return (
    <>
      <PageHeader
        title="SEO"
        description="Defaults applied whenever a page leaves its own SEO fields blank."
      />

      <div className="space-y-5">
        {siteUrlMissing ? (
          <p className="flex items-start gap-2 rounded-md border border-[color-mix(in_oklch,var(--warning)_45%,transparent)] bg-[color-mix(in_oklch,var(--warning)_12%,transparent)] px-3 py-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--warning)]" />
            <span>
              Your public URL is still{" "}
              <code className="rounded bg-muted px-1">
                {site.siteUrl || "unset"}
              </code>
              . Canonical URLs and the sitemap need the real domain — set it in{" "}
              <Link
                href="/admin/settings"
                className="text-primary underline-offset-2 hover:underline"
              >
                Site settings
              </Link>
              .
            </span>
          </p>
        ) : null}

        <DefaultSeoForm
          settings={site}
          readOnly={!hasPermission({ role: session.role }, "seo.update")}
        />

        <Card>
          <CardHeader
            title="Published pages missing metadata"
            description="Search engines will still index these, but they will write your snippet for you."
          />

          {issues.length === 0 ? (
            <CardBody className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-[var(--success)]" />
              Every published page has a title and description.
            </CardBody>
          ) : (
            <ul className="divide-y divide-border">
              {issues.map(({ page, problems }) => (
                <li
                  key={page.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <Link
                    href={`/admin/pages/${page.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {page.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {problems.join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Generated files" />
          <CardBody className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Built from your content on every revalidation.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                /sitemap.xml
                {config.frontend.sitemap ? "" : " (disabled in cms.config.ts)"}
              </Link>
              <Link
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                /robots.txt
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
