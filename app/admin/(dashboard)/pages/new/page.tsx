import { PageForm } from "@/components/cms/page-form";
import { PageHeader } from "@/components/cms/page-header";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { pages } from "@/lib/cms/repositories/pages";
import { settings } from "@/lib/cms/repositories/settings";

export const metadata = { title: "New page" };

export default async function NewPagePage() {
  const session = await requirePermission("pages.create");

  const [tree, siteUrl] = await Promise.all([
    pages.tree(),
    settings.siteUrl(),
  ]);

  const parentOptions = flatten(tree);

  return (
    <>
      <PageHeader
        title="New page"
        breadcrumbs={[
          { label: "Pages", href: "/admin/pages" },
          { label: "New page" },
        ]}
      />

      <PageForm
        page={null}
        parentOptions={parentOptions}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "pages.publish")}
      />
    </>
  );
}

/** Flattens the page tree into an indented list for the parent picker. */
function flatten(
  nodes: { id: string; title: string; slug: string; children: unknown[] }[],
  depth = 0,
): { id: string; title: string; slug: string }[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      title: `${"— ".repeat(depth)}${node.title}`,
      slug: node.slug,
    },
    ...flatten(
      node.children as { id: string; title: string; slug: string; children: unknown[] }[],
      depth + 1,
    ),
  ]);
}
