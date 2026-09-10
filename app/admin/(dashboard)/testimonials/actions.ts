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
import { testimonials } from "@/lib/cms/repositories/testimonials";
import { testimonialInputWithRulesSchema } from "@/schemas/testimonial";
import type { ContentStatus } from "@/types/common";

/** Testimonial server actions. */

function parseFormData(formData: FormData) {
  return {
    name: formString(formData.get("name")),
    image: formString(formData.get("image")),
    rating: formString(formData.get("rating")) || "5",
    message: formString(formData.get("message")),
    position: formString(formData.get("position")),
    company: formString(formData.get("company")),
    country: formString(formData.get("country")),
    tourId: formString(formData.get("tourId")),
    featured: formBoolean(formData.get("featured")),
    order: formString(formData.get("order")) || "0",
    status: formString(formData.get("status")),
    publishedAt: formString(formData.get("publishedAt")) || null,
  };
}

export async function saveTestimonialAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData.get("id"));
  const isNew = !id;

  let createdId: string | null = null;

  try {
    const session = await requirePermission(
      isNew ? "testimonials.create" : "testimonials.update",
    );

    const parsed = testimonialInputWithRulesSchema.safeParse(
      parseFormData(formData),
    );
    if (!parsed.success) return toActionState(parsed.error);

    if (parsed.data.status === "published" || parsed.data.status === "scheduled") {
      await requirePermission("testimonials.publish");
    }

    const record = isNew
      ? await testimonials.create(parsed.data, { userId: session.userId })
      : await testimonials.update(id, parsed.data, { userId: session.userId });

    await activity.record({
      action: isNew ? "created" : "updated",
      entityType: "testimonials",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/", "layout");

    if (isNew) createdId = record.id;
  } catch (error) {
    return toActionState(error);
  }

  if (createdId) redirect(`/admin/testimonials/${createdId}`);

  return actionSuccess("Testimonial saved.");
}

export async function setTestimonialStatusAction(
  id: string,
  status: ContentStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission(
      status === "trash" ? "testimonials.delete" : "testimonials.publish",
    );

    const record = await testimonials.setStatus(id, status, {
      userId: session.userId,
    });

    await activity.record({
      action:
        status === "published"
          ? "published"
          : status === "trash"
            ? "trashed"
            : "unpublished",
      entityType: "testimonials",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/", "layout");
    return actionSuccess("Testimonial updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteTestimonialAction(
  id: string,
): Promise<ActionState> {
  try {
    const session = await requirePermission("testimonials.delete");

    const record = await testimonials.get(id);
    if (!record) return actionError("That testimonial no longer exists.");

    await testimonials.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "testimonials",
      entityId: id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/testimonials");
    revalidatePath("/", "layout");
    return actionSuccess("Testimonial deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicateTestimonialAction(
  id: string,
): Promise<ActionState> {
  try {
    const session = await requirePermission("testimonials.create");
    const copy = await testimonials.duplicate(id, { userId: session.userId });

    await activity.record({
      action: "duplicated",
      entityType: "testimonials",
      entityId: copy.id,
      entityTitle: copy.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/testimonials");
    return actionSuccess("Testimonial duplicated.", { id: copy.id });
  } catch (error) {
    return toActionState(error);
  }
}
