"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  actionError,
  actionSuccess,
  formBoolean,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth";
import { activity } from "@/lib/cms/repositories/activity";
import { pages } from "@/lib/cms/repositories/pages";
import { pageInputWithRulesSchema } from "@/schemas/page";
import type { ContentStatus } from "@/types/common";

/**
 * Page server actions.
 *
 * Every one of these starts with `requirePermission`, so authorisation is
 * enforced on the server no matter what the UI did or did not render (§17).
 */

function parseFormData(formData: FormData) {
  // Custom metadata arrives as parallel key/value inputs.
  const metaKeys = formData.getAll("metaKey").map(String);
  const metaValues = formData.getAll("metaValue").map(String);
  const meta: Record<string, string> = {};
  metaKeys.forEach((key, index) => {
    const trimmed = key.trim();
    if (trimmed) meta[trimmed] = metaValues[index] ?? "";
  });

  // The block editor posts the whole body as one JSON field. Anything that is
  // not a parseable array is treated as an empty body rather than throwing:
  // the Zod schema below is what decides whether the contents are acceptable,
  // and it reports per-block errors the form can show.
  let body: unknown = [];
  try {
    const parsed: unknown = JSON.parse(formString(formData.get("body")) || "[]");
    if (Array.isArray(parsed)) body = parsed;
  } catch {
    body = [];
  }

  return {
    title: formString(formData.get("title")),
    slug: formString(formData.get("slug")) || formString(formData.get("title")),
    excerpt: formString(formData.get("excerpt")),
    body,
    featuredImage: formString(formData.get("featuredImage")),
    parentId: formString(formData.get("parentId")) || null,
    order: formString(formData.get("order")) || "0",
    showInNavigation: formBoolean(formData.get("showInNavigation")),
    template: formString(formData.get("template")),
    status: formString(formData.get("status")),
    publishedAt: formString(formData.get("publishedAt")) || null,
    seo: {
      title: formString(formData.get("seo.title")),
      description: formString(formData.get("seo.description")),
      canonical: formString(formData.get("seo.canonical")),
      robots: formString(formData.get("seo.robots")) || "index",
      noFollow: formBoolean(formData.get("seo.noFollow")),
      ogTitle: formString(formData.get("seo.ogTitle")),
      ogDescription: formString(formData.get("seo.ogDescription")),
      ogImage: formString(formData.get("seo.ogImage")),
      twitterCard:
        formString(formData.get("seo.twitterCard")) || "summary_large_image",
      structuredData: formString(formData.get("seo.structuredData")),
    },
    meta,
  };
}

export async function savePageAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData.get("id"));
  const isNew = !id;

  let createdId: string | null = null;

  try {
    const session = await requirePermission(isNew ? "pages.create" : "pages.update");

    const parsed = pageInputWithRulesSchema.safeParse(parseFormData(formData));
    if (!parsed.success) return toActionState(parsed.error);

    // Publishing is a separate permission from editing, so an Author cannot
    // push their own draft live by switching the status dropdown.
    if (parsed.data.status === "published" || parsed.data.status === "scheduled") {
      await requirePermission("pages.publish");
    }

    const page = isNew
      ? await pages.create(parsed.data, { userId: session.userId })
      : await pages.update(id, parsed.data, { userId: session.userId });

    await activity.record({
      action: isNew ? "created" : "updated",
      entityType: "pages",
      entityId: page.id,
      entityTitle: page.title,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/pages");
    // The home page lists published pages and the header renders menus, so a
    // page change can affect any route under the root layout.
    revalidatePath("/", "layout");

    if (isNew) createdId = page.id;
  } catch (error) {
    return toActionState(error);
  }

  if (createdId) redirect(`/admin/pages/${createdId}`);

  return actionSuccess("Page saved.");
}

export async function setPageStatusAction(
  id: string,
  status: ContentStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission(
      status === "trash" ? "pages.delete" : "pages.publish",
    );

    const page = await pages.setStatus(id, status, { userId: session.userId });

    await activity.record({
      action:
        status === "published"
          ? "published"
          : status === "trash"
            ? "trashed"
            : "unpublished",
      entityType: "pages",
      entityId: page.id,
      entityTitle: page.title,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/pages");
    revalidatePath("/", "layout");
    return actionSuccess("Page updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deletePageAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("pages.delete");

    const page = await pages.get(id);
    if (!page) return actionError("That page no longer exists.");

    await pages.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "pages",
      entityId: id,
      entityTitle: page.title,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/pages");
    revalidatePath("/", "layout");
    return actionSuccess("Page deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicatePageAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("pages.create");
    const copy = await pages.duplicate(id, { userId: session.userId });

    await activity.record({
      action: "duplicated",
      entityType: "pages",
      entityId: copy.id,
      entityTitle: copy.title,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/pages");
    return actionSuccess("Page duplicated.", { id: copy.id });
  } catch (error) {
    return toActionState(error);
  }
}
