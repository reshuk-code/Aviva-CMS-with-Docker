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
import { settingsInputSchema } from "@/schemas/settings";

/**
 * Site settings.
 *
 * The form posts every field, so the whole settings object is revalidated on
 * each save. There is nothing partial to reconcile.
 */
export async function saveSettingsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("settings.update");

    const parsed = settingsInputSchema.safeParse({
      siteName: formString(formData.get("siteName")),
      tagline: formString(formData.get("tagline")),
      logo: formString(formData.get("logo")),
      favicon: formString(formData.get("favicon")),
      siteUrl: formString(formData.get("siteUrl")),
      locale: formString(formData.get("locale")) || "en",
      timezone: formString(formData.get("timezone")) || "Asia/Kathmandu",
      contact: {
        email: formString(formData.get("contact.email")),
        phone: formString(formData.get("contact.phone")),
        whatsapp: formString(formData.get("contact.whatsapp")),
        address: formString(formData.get("contact.address")),
      },
      social: {
        facebook: formString(formData.get("social.facebook")),
        instagram: formString(formData.get("social.instagram")),
        twitter: formString(formData.get("social.twitter")),
        youtube: formString(formData.get("social.youtube")),
        tripadvisor: formString(formData.get("social.tripadvisor")),
      },
      defaultSeo: {
        title: formString(formData.get("defaultSeo.title")),
        description: formString(formData.get("defaultSeo.description")),
        ogImage: formString(formData.get("defaultSeo.ogImage")),
        twitterCard:
          formString(formData.get("defaultSeo.twitterCard")) ||
          "summary_large_image",
        robots: formString(formData.get("defaultSeo.robots")) || "index",
      },
      integrations: {
        googleAnalyticsId: formString(formData.get("integrations.googleAnalyticsId")),
        googleTagManagerId: formString(
          formData.get("integrations.googleTagManagerId"),
        ),
        facebookPixelId: formString(formData.get("integrations.facebookPixelId")),
        googleSiteVerification: formString(
          formData.get("integrations.googleSiteVerification"),
        ),
      },
      maintenanceMode: formBoolean(formData.get("maintenanceMode")),
    });

    if (!parsed.success) return toActionState(parsed.error);

    await settings.update(parsed.data);

    revalidatePath("/admin/settings");
    revalidatePath("/admin/seo");
    // Site name, menus and SEO defaults are rendered site-wide.
    revalidatePath("/", "layout");

    return actionSuccess("Settings saved.");
  } catch (error) {
    return toActionState(error);
  }
}
