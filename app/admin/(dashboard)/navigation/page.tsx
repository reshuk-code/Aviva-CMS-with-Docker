import Link from "next/link";
import { Navigation as NavigationIcon } from "lucide-react";

import { PageHeader } from "@/components/cms/page-header";
import { MenuWorkspace } from "@/app/admin/(dashboard)/navigation/menu-workspace";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { navigation } from "@/lib/cms/repositories/navigation";
import { pages } from "@/lib/cms/repositories/pages";

export const metadata = { title: "Navigation" };

export default async function NavigationPage({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string }>;
}) {
  const session = await requirePermission("navigation.read");
  const { menu: selectedKey } = await searchParams;

  const [menus, published] = await Promise.all([
    navigation.listMenus(),
    pages.getPublished(),
  ]);

  const pageOptions = published.map((page) => ({
    id: page.id,
    title: page.title,
    slug: page.slug,
  }));

  const canEdit = hasPermission({ role: session.role }, "navigation.update");
  const canCreate = hasPermission({ role: session.role }, "navigation.create");
  const canDelete = hasPermission({ role: session.role }, "navigation.delete");

  return (
    <>
      <PageHeader
        title="Navigation"
        description="Menus your frontend reads with cms.navigation.get(key). The CMS stores the structure; your components decide how it looks."
      />

      {menus.length === 0 && !canCreate ? (
        <Card>
          <EmptyState
            icon={<NavigationIcon className="size-8" />}
            title="No menus yet"
            description="Ask an administrator to create one."
          />
        </Card>
      ) : (
        <MenuWorkspace
          menus={menus}
          selectedKey={selectedKey}
          pageOptions={pageOptions}
          canEdit={canEdit}
          canCreate={canCreate}
          canDelete={canDelete}
        />
      )}

      {pageOptions.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No published pages yet, so page links have nothing to point at.{" "}
          <Link href="/admin/pages/new" className="text-primary underline-offset-2 hover:underline">
            Create a page
          </Link>{" "}
          first, or use custom URLs.
        </p>
      ) : null}
    </>
  );
}
