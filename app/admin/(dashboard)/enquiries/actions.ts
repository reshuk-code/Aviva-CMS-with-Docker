"use server";

import { revalidatePath } from "next/cache";

import {
  actionError,
  actionSuccess,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth";
import { activity } from "@/lib/cms/repositories/activity";
import { enquiries } from "@/lib/cms/repositories/enquiries";
import { enquiryStatusSchema, enquiryUpdateSchema } from "@/schemas/enquiry";
import type { EnquiryStatus } from "@/types/content";

/**
 * Enquiry server actions.
 *
 * Triage only. There is deliberately no action that edits the traveller's own
 * words — see the note on the repository.
 */

export async function triageEnquiryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission("enquiries.update");

    const id = formString(formData.get("id"));
    if (!id) return actionError("Missing enquiry id.");

    const parsed = enquiryUpdateSchema.safeParse({
      status: formString(formData.get("status")),
      notes: formString(formData.get("notes")),
    });
    if (!parsed.success) return toActionState(parsed.error);

    const record = await enquiries.triage(id, parsed.data, {
      userId: session.userId,
    });

    await activity.record({
      action: "updated",
      entityType: "enquiries",
      entityId: record.id,
      entityTitle: `${record.name} (${record.status})`,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/enquiries");
    revalidatePath(`/admin/enquiries/${id}`);
    return actionSuccess("Enquiry updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function setEnquiryStatusAction(
  id: string,
  status: EnquiryStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission("enquiries.update");

    const parsed = enquiryStatusSchema.safeParse(status);
    if (!parsed.success) return toActionState(parsed.error);

    const record = await enquiries.setStatus(id, parsed.data, {
      userId: session.userId,
    });

    await activity.record({
      action: "updated",
      entityType: "enquiries",
      entityId: record.id,
      entityTitle: `${record.name} (${record.status})`,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/enquiries");
    revalidatePath(`/admin/enquiries/${id}`);
    return actionSuccess("Enquiry updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteEnquiryAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("enquiries.delete");

    const record = await enquiries.get(id);
    if (!record) return actionError("That enquiry no longer exists.");

    await enquiries.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "enquiries",
      entityId: id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/enquiries");
    return actionSuccess("Enquiry deleted.");
  } catch (error) {
    return toActionState(error);
  }
}
