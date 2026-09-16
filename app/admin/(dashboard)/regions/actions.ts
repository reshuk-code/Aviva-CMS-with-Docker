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
import { parseFaqRows } from "@/lib/actions/faq-input";
import { requirePermission } from "@/lib/auth";
import { activity } from "@/lib/cms/repositories/activity";
import { regions } from "@/lib/cms/repositories/regions";
import { regionInputWithRulesSchema } from "@/schemas/region";
import type { ContentStatus } from "@/types/common";

/**
 * Region server actions.
 *
 * The repeatable fields (gallery, highlights, best season) arrive as several
 * inputs sharing one name, which is what `getAll` is for.
 */

function parseFormData(formData: FormData) {
  return {
    name: formString(formData.get("name")),
    slug: formString(formData.get("slug")) || formString(formData.get("name")),
    shortDescription: formString(formData.get("shortDescription")),
    description: formString(formData.get("description")),
    featuredImage: formString(formData.get("featuredImage")),
    gallery: formData.getAll("gallery").map(String),
    country: formString(formData.get("country")),
    elevationRange: formString(formData.get("elevationRange")),
    highlights: formData.getAll("highlights").map(String),
    faqs: parseFaqRows(formData),
    bestSeason: formData.getAll("bestSeason").map(String),
    featured: formBoolean(formData.get("featured")),
    order: formString(formData.get("order")) || "0",
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
  };
}

export async function saveRegionAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData.get("id"));
  const isNew = !id;

  let createdId: string | null = null;

  try {
    const session = await requirePermission(
      isNew ? "regions.create" : "regions.update",
    );

    const parsed = regionInputWithRulesSchema.safeParse(parseFormData(formData));
    if (!parsed.success) return toActionState(parsed.error);

    if (parsed.data.status === "published" || parsed.data.status === "scheduled") {
      await requirePermission("regions.publish");
    }

    const record = isNew
      ? await regions.create(parsed.data, { userId: session.userId })
      : await regions.update(id, parsed.data, { userId: session.userId });

    await activity.record({
      action: isNew ? "created" : "updated",
      entityType: "regions",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/regions");
    revalidatePath("/", "layout");

    if (isNew) createdId = record.id;
  } catch (error) {
    return toActionState(error);
  }

  if (createdId) redirect(`/admin/regions/${createdId}`);

  return actionSuccess("Region saved.");
}

export async function setRegionStatusAction(
  id: string,
  status: ContentStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission(
      status === "trash" ? "regions.delete" : "regions.publish",
    );

    const record = await regions.setStatus(id, status, {
      userId: session.userId,
    });

    await activity.record({
      action:
        status === "published"
          ? "published"
          : status === "trash"
            ? "trashed"
            : "unpublished",
      entityType: "regions",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/regions");
    revalidatePath("/", "layout");
    return actionSuccess("Region updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteRegionAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("regions.delete");

    const record = await regions.get(id);
    if (!record) return actionError("That region no longer exists.");

    await regions.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "regions",
      entityId: id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/regions");
    revalidatePath("/", "layout");
    return actionSuccess("Region deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicateRegionAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("regions.create");
    const copy = await regions.duplicate(id, { userId: session.userId });

    await activity.record({
      action: "duplicated",
      entityType: "regions",
      entityId: copy.id,
      entityTitle: copy.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/regions");
    return actionSuccess("Region duplicated.", { id: copy.id });
  } catch (error) {
    return toActionState(error);
  }
}
