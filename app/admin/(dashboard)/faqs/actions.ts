"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  actionError,
  actionSuccess,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth";
import { activity } from "@/lib/cms/repositories/activity";
import { faqs } from "@/lib/cms/repositories/faqs";
import { faqInputWithRulesSchema } from "@/schemas/faq";
import type { ContentStatus } from "@/types/common";

/** FAQ server actions. */

function parseFormData(formData: FormData) {
  return {
    question: formString(formData.get("question")),
    answer: formString(formData.get("answer")),
    category: formString(formData.get("category")),
    order: formString(formData.get("order")) || "0",
    status: formString(formData.get("status")),
    publishedAt: formString(formData.get("publishedAt")) || null,
  };
}

export async function saveFaqAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData.get("id"));
  const isNew = !id;

  let createdId: string | null = null;

  try {
    const session = await requirePermission(
      isNew ? "faqs.create" : "faqs.update",
    );

    const parsed = faqInputWithRulesSchema.safeParse(parseFormData(formData));
    if (!parsed.success) return toActionState(parsed.error);

    if (parsed.data.status === "published" || parsed.data.status === "scheduled") {
      await requirePermission("faqs.publish");
    }

    const record = isNew
      ? await faqs.create(parsed.data, { userId: session.userId })
      : await faqs.update(id, parsed.data, { userId: session.userId });

    await activity.record({
      action: isNew ? "created" : "updated",
      entityType: "faqs",
      entityId: record.id,
      entityTitle: record.question,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/faqs");
    revalidatePath("/", "layout");

    if (isNew) createdId = record.id;
  } catch (error) {
    return toActionState(error);
  }

  if (createdId) redirect(`/admin/faqs/${createdId}`);

  return actionSuccess("FAQ saved.");
}

export async function setFaqStatusAction(
  id: string,
  status: ContentStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission(
      status === "trash" ? "faqs.delete" : "faqs.publish",
    );

    const record = await faqs.setStatus(id, status, { userId: session.userId });

    await activity.record({
      action:
        status === "published"
          ? "published"
          : status === "trash"
            ? "trashed"
            : "unpublished",
      entityType: "faqs",
      entityId: record.id,
      entityTitle: record.question,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/faqs");
    revalidatePath("/", "layout");
    return actionSuccess("FAQ updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteFaqAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("faqs.delete");

    const record = await faqs.get(id);
    if (!record) return actionError("That FAQ no longer exists.");

    await faqs.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "faqs",
      entityId: id,
      entityTitle: record.question,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/faqs");
    revalidatePath("/", "layout");
    return actionSuccess("FAQ deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicateFaqAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("faqs.create");
    const copy = await faqs.duplicate(id, { userId: session.userId });

    await activity.record({
      action: "duplicated",
      entityType: "faqs",
      entityId: copy.id,
      entityTitle: copy.question,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/faqs");
    return actionSuccess("FAQ duplicated.", { id: copy.id });
  } catch (error) {
    return toActionState(error);
  }
}
