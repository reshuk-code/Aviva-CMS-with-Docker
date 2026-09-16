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
import { settings } from "@/lib/cms/repositories/settings";
import { headerInputSchema } from "@/schemas/settings";

/**
 * Header chrome.
 *
 * Patches only the `header` key — the site settings screen owns the rest, and
 * two people editing different screens should not overwrite each other.
 */
export async function saveHeaderAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("settings.update");

    const parsed = headerInputSchema.safeParse({
      announcement: {
        enabled: formBoolean(formData.get("announcement.enabled")),
        text: formString(formData.get("announcement.text")),
        href: formString(formData.get("announcement.href")),
        linkLabel: formString(formData.get("announcement.linkLabel")),
      },
      sticky: formBoolean(formData.get("sticky")),
      showContact: formBoolean(formData.get("showContact")),
      cta: {
        label: formString(formData.get("cta.label")),
        href: formString(formData.get("cta.href")),
      },
    });

    if (!parsed.success) return toActionState(parsed.error);

    await settings.update({ header: parsed.data });

    revalidatePath("/admin/settings/header");
    // The header renders on every public page.
    revalidatePath("/", "layout");

    return actionSuccess("Header saved.");
  } catch (error) {
    return toActionState(error);
  }
}
