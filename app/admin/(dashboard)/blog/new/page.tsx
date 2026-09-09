import { PageHeader } from "@/components/cms/page-header";
import { PostForm } from "@/components/cms/post-form";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { posts } from "@/lib/cms/repositories/posts";
import { settings } from "@/lib/cms/repositories/settings";
import { users } from "@/lib/cms/repositories/users";

export const metadata = { title: "New post" };

export default async function NewPostPage() {
  const session = await requirePermission("blog.create");

  const [authors, categories, tags, siteUrl] = await Promise.all([
    users.list({ perPage: 100 }),
    posts.categories(),
    posts.tags(),
    settings.siteUrl(),
  ]);

  return (
    <>
      <PageHeader
        title="New post"
        breadcrumbs={[{ label: "Blog", href: "/admin/blog" }, { label: "New post" }]}
      />

      <PostForm
        post={null}
        authorOptions={authors.items.map(({ id, name }) => ({ id, name }))}
        categoryOptions={categories}
        tagOptions={tags.map((tag) => tag.name)}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "blog.publish")}
      />
    </>
  );
}
