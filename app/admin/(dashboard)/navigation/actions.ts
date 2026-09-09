"use server";

import { revalidatePath } from "next/cache";

import {
  actionSuccess,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth";
import { navigation } from "@/lib/cms/repositories/navigation";
import { menuInputSchema, type MenuItemInput } from "@/schemas/navigation";

/**
 * Menu server actions.
 *
 * The tree is edited entirely in the browser and submitted as one JSON blob,
 * which keeps drag-reordering responsive and means a save is a single atomic
 * write rather than a sequence of per-item mutations.
 */
export async function saveMenuAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = formString(formData.get("id"));
    await requirePermission(id ? "navigation.update" : "navigation.create");

    let items: MenuItemInput[] = [];
    const raw = formString(formData.get("items"));
    if (raw) {
      try {
        items = JSON.parse(raw) as MenuItemInput[];
      } catch {
        return toActionState(
          new Error("The menu could not be read. Reload the page and try again."),
        );
      }
    }

    const parsed = menuInputSchema.safeParse({
      key: formString(formData.get("key")),
      name: formString(formData.get("name")),
      items,
    });

    if (!parsed.success) return toActionState(parsed.error);

    const menu = id
      ? await navigation.update(id, parsed.data)
      : await navigation.create(parsed.data);

    revalidatePath("/admin/navigation");
    revalidatePath("/", "layout");

    return actionSuccess("Menu saved.", { id: menu.id });
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteMenuAction(id: string): Promise<ActionState> {
  try {
    await requirePermission("navigation.delete");
    await navigation.delete(id);

    revalidatePath("/admin/navigation");
    revalidatePath("/", "layout");

    return actionSuccess("Menu deleted.");
  } catch (error) {
    return toActionState(error);
  }
}
