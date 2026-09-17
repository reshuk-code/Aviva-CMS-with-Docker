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
import { destinations } from "@/lib/cms/repositories/destinations";
import { destinationInputWithRulesSchema } from "@/schemas/destination";
import type { ContentStatus } from "@/types/common";

/**
 * Destination server actions.
 *
 * The repeatable fields (gallery, best season) arrive as several
 * inputs sharing one name, which is what `getAll` is for.
 */

function parseFormData(formData: FormData) {
  return {
    name: formString(formData.get("name")),
    slug: formString(formData.get("slug")) || formString(formData.get("name")),
    shortDescription: formString(formData.get("shortDescription")),
    description: formString(formData.get("description")),
    featuredImage: formString(formData.get("featuredImage")),
    featuredImageHorizontal: formString(formData.get("featuredImageHorizontal")),
    featuredImageVertical: formString(formData.get("featuredImageVertical")),
    bannerImage: formString(formData.get("bannerImage")),
    gallery: formData.getAll("gallery").map(String),
    country: formString(formData.get("country")),
    region: formString(formData.get("region")),
    latitude: formString(formData.get("latitude")),
    longitude: formString(formData.get("longitude")),
    highlights: formString(formData.get("highlights")),
    faqs: parseFaqRows(formData),
    bestSeason: formData.getAll("bestSeason").map(String),
    typicalDuration: formString(formData.get("typicalDuration")),
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

export async function saveDestinationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData.get("id"));
  const isNew = !id;

  let createdId: string | null = null;

  try {
    const session = await requirePermission(
      isNew ? "destinations.create" : "destinations.update",
    );

    const parsed = destinationInputWithRulesSchema.safeParse(
      parseFormData(formData),
    );
    if (!parsed.success) return toActionState(parsed.error);

    if (parsed.data.status === "published" || parsed.data.status === "scheduled") {
      await requirePermission("destinations.publish");
    }

    const record = isNew
      ? await destinations.create(parsed.data, { userId: session.userId })
      : await destinations.update(id, parsed.data, { userId: session.userId });

    await activity.record({
      action: isNew ? "created" : "updated",
      entityType: "destinations",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/destinations");
    revalidatePath("/", "layout");

    if (isNew) createdId = record.id;
  } catch (error) {
    return toActionState(error);
  }

  if (createdId) redirect(`/admin/destinations/${createdId}`);

  return actionSuccess("Destination saved.");
}

export async function setDestinationStatusAction(
  id: string,
  status: ContentStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission(
      status === "trash" ? "destinations.delete" : "destinations.publish",
    );

    const record = await destinations.setStatus(id, status, {
      userId: session.userId,
    });

    await activity.record({
      action:
        status === "published"
          ? "published"
          : status === "trash"
            ? "trashed"
            : "unpublished",
      entityType: "destinations",
      entityId: record.id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/destinations");
    revalidatePath("/", "layout");
    return actionSuccess("Destination updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteDestinationAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("destinations.delete");

    const record = await destinations.get(id);
    if (!record) return actionError("That destination no longer exists.");

    await destinations.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "destinations",
      entityId: id,
      entityTitle: record.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/destinations");
    revalidatePath("/", "layout");
    return actionSuccess("Destination deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicateDestinationAction(
  id: string,
): Promise<ActionState> {
  try {
    const session = await requirePermission("destinations.create");
    const copy = await destinations.duplicate(id, { userId: session.userId });

    await activity.record({
      action: "duplicated",
      entityType: "destinations",
      entityId: copy.id,
      entityTitle: copy.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/destinations");
    return actionSuccess("Destination duplicated.", { id: copy.id });
  } catch (error) {
    return toActionState(error);
  }
}
