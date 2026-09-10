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
import { activities } from "@/lib/cms/repositories/activities";
import { activity } from "@/lib/cms/repositories/activity";
import { activityInputWithRulesSchema } from "@/schemas/activity";
import type { ContentStatus } from "@/types/common";

/** Activity server actions. `activity` here is the audit log, not the model. */

function parseFormData(formData: FormData) {
  return {
    name: formString(formData.get("name")),
    slug: formString(formData.get("slug")) || formString(formData.get("name")),
    description: formString(formData.get("description")),
    icon: formString(formData.get("icon")),
    featuredImage: formString(formData.get("featuredImage")),
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

export async function saveActivityAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData.get("id"));
  const isNew = !id;

  let createdId: string | null = null;

  try {
    const session = await requirePermission(
      isNew ? "activities.create" : "activities.update",
    );

    const parsed = activityInputWithRulesSchema.safeParse(
      parseFormData(formData),
    );
    if (!parsed.success) return toActionState(parsed.error);

    if (parsed.data.status === "published" || parsed.data.status === "scheduled") {
      await requirePermission("activities.publish");
    }

    const record = isNew
      ? await activities.create(parsed.data, { userId: session.userId })
      : await activities.update(id, parsed.data, { userId: session.userId });

    await activity.record({
      action: isNew ? "created" : "updated",
      entityType: "activities",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/activities");
    revalidatePath("/", "layout");

    if (isNew) createdId = record.id;
  } catch (error) {
    return toActionState(error);
  }

  if (createdId) redirect(`/admin/activities/${createdId}`);

  return actionSuccess("Activity saved.");
}

export async function setActivityStatusAction(
  id: string,
  status: ContentStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission(
      status === "trash" ? "activities.delete" : "activities.publish",
    );

    const record = await activities.setStatus(id, status, {
      userId: session.userId,
    });

    await activity.record({
      action:
        status === "published"
          ? "published"
          : status === "trash"
            ? "trashed"
            : "unpublished",
      entityType: "activities",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/activities");
    revalidatePath("/", "layout");
    return actionSuccess("Activity updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteActivityAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("activities.delete");

    const record = await activities.get(id);
    if (!record) return actionError("That activity no longer exists.");

    await activities.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "activities",
      entityId: id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/activities");
    revalidatePath("/admin/tours", "layout");
    revalidatePath("/", "layout");
    return actionSuccess("Activity deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicateActivityAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("activities.create");
    const copy = await activities.duplicate(id, { userId: session.userId });

    await activity.record({
      action: "duplicated",
      entityType: "activities",
      entityId: copy.id,
      entityTitle: copy.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/activities");
    return actionSuccess("Activity duplicated.", { id: copy.id });
  } catch (error) {
    return toActionState(error);
  }
}
