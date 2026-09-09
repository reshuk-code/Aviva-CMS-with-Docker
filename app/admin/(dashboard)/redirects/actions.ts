"use server";

import { revalidatePath } from "next/cache";

import {
  actionSuccess,
  formBoolean,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth";
import { redirects } from "@/lib/cms/repositories/redirects";
import { redirectInputSchema } from "@/schemas/settings";

export async function saveRedirectAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = formString(formData.get("id"));
    await requirePermission(id ? "redirects.update" : "redirects.create");

    const parsed = redirectInputSchema.safeParse({
      source: formString(formData.get("source")),
      destination: formString(formData.get("destination")),
      permanent: formBoolean(formData.get("permanent")),
      enabled: formBoolean(formData.get("enabled")),
    });

    if (!parsed.success) return toActionState(parsed.error);

    if (id) await redirects.update(id, parsed.data);
    else await redirects.create(parsed.data);

    revalidatePath("/admin/redirects");
    revalidatePath("/", "layout");

    return actionSuccess(id ? "Redirect updated." : "Redirect created.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteRedirectAction(id: string): Promise<ActionState> {
  try {
    await requirePermission("redirects.delete");
    await redirects.delete(id);

    revalidatePath("/admin/redirects");
    revalidatePath("/", "layout");

    return actionSuccess("Redirect deleted.");
  } catch (error) {
    return toActionState(error);
  }
}
