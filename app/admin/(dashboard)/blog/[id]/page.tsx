import { notFound } from "next/navigation";

import { PageHeader } from "@/components/cms/page-header";
import { PostForm } from "@/components/cms/post-form";
import { StatusBadge } from "@/components/ui/badge";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { posts } from "@/lib/cms/repositories/posts";
import { settings } from "@/lib/cms/repositories/settings";
import { users } from "@/lib/cms/repositories/users";
import { describeRecord } from "@/lib/record-meta";

export const metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("blog.update");
  const { id } = await params;

  const [post, authors, categories, tags, siteUrl] = await Promise.all([
    posts.get(id),
    users.list({ perPage: 100 }),
    posts.categories(),
    posts.tags(),
    settings.siteUrl(),
  ]);

  if (!post) notFound();

  return (
    <>
      <PageHeader
        title={post.title}
        description={describeRecord(post)}
        breadcrumbs={[{ label: "Blog", href: "/admin/blog" }, { label: post.title }]}
        actions={<StatusBadge status={post.status} />}
      />

      <PostForm
        post={post}
        authorOptions={authors.items.map(({ id: userId, name }) => ({ id: userId, name }))}
        categoryOptions={categories}
        tagOptions={tags.map((tag) => tag.name)}
        siteUrl={siteUrl}
        canPublish={hasPermission({ role: session.role }, "blog.publish")}
      />
    </>
  );
}
