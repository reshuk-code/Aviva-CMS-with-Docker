"use server";

import { revalidatePath } from "next/cache";

import {
  actionSuccess,
  formString,
  toActionState,
  type ActionState,
} from "@/lib/actions/result";
import { requirePermission } from "@/lib/auth";
import { settings } from "@/lib/cms/repositories/settings";
import { settingsInputSchema } from "@/schemas/settings";

/**
 * Saves only the site-wide SEO defaults.
 *
 * The rest of the settings object is read back and passed through, so this
 * screen cannot clobber fields it does not show.
 */
export async function saveDefaultSeoAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("seo.update");

    const current = await settings.get();

    const parsed = settingsInputSchema.shape.defaultSeo.safeParse({
      title: formString(formData.get("defaultSeo.title")),
      description: formString(formData.get("defaultSeo.description")),
      ogImage: formString(formData.get("defaultSeo.ogImage")),
      twitterCard:
        formString(formData.get("defaultSeo.twitterCard")) || "summary_large_image",
      robots: formString(formData.get("defaultSeo.robots")) || "index",
    });

    if (!parsed.success) return toActionState(parsed.error);

    await settings.update({ ...current, defaultSeo: parsed.data });

    revalidatePath("/admin/seo");
    revalidatePath("/", "layout");

    return actionSuccess("SEO defaults saved.");
  } catch (error) {
    return toActionState(error);
  }
}
