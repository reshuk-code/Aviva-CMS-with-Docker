import { notFound } from "next/navigation";

import { PageForm } from "@/components/cms/page-form";
import { PageHeader } from "@/components/cms/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { pages } from "@/lib/cms/repositories/pages";
import { settings } from "@/lib/cms/repositories/settings";
import { describeRecord } from "@/lib/record-meta";

import type { CmsPageNode } from "@/types/page";

export const metadata = { title: "Edit page" };

export default async function EditPagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("pages.update");
  const { id } = await params;

  const [page, tree, siteUrl] = await Promise.all([
    pages.get(id),
    pages.tree(),
    settings.siteUrl(),
  ]);

  if (!page) notFound();

  // A page cannot be its own parent or a child of its own descendants; the
  // repository rejects that anyway, but excluding them keeps the UI honest.
  const excluded = collectSubtreeIds(tree, page.id);
  const parentOptions = flatten(tree).filter(
    (option) => !excluded.has(option.id),
  );

  return (
    <>
      <PageHeader
        title={page.title}
        description={describeRecord(page)}
        breadcrumbs={[
          { label: "Pages", href: "/admin/pages" },
          { label: page.title },
        ]}
        actions={<StatusBadge status={page.status} />}
      />

      <PageForm
        page={page}
        parentOptions={parentOptions}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "pages.publish")}
      />
    </>
  );
}

function flatten(
  nodes: CmsPageNode[],
  depth = 0,
): { id: string; title: string; slug: string }[] {
  return nodes.flatMap((node) => [
    { id: node.id, title: `${"— ".repeat(depth)}${node.title}`, slug: node.slug },
    ...flatten(node.children, depth + 1),
  ]);
}

/** The page itself plus every descendant, as a set of ids. */
function collectSubtreeIds(nodes: CmsPageNode[], rootId: string): Set<string> {
  const found = new Set<string>();

  const walk = (node: CmsPageNode, inside: boolean) => {
    const within = inside || node.id === rootId;
    if (within) found.add(node.id);
    node.children.forEach((child) => walk(child, within));
  };

  nodes.forEach((node) => walk(node, false));
  return found;
}
