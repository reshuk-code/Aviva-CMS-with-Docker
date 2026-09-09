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
import { tours } from "@/lib/cms/repositories/tours";
import { tourInputWithRulesSchema } from "@/schemas/tour";
import type { ContentStatus } from "@/types/common";

/**
 * Tour package server actions.
 *
 * The itinerary is the one field that does not arrive as plain form inputs: a
 * day carries its own lists of meals, activities and images, which parallel
 * inputs cannot express without inventing an encoding. The editor posts JSON
 * instead, parsed here and validated by the schema like everything else.
 */

/** Parses a JSON array from a hidden field. Returns null if it is not one. */
function parseJsonArray(value: FormDataEntryValue | null): unknown[] | null {
  const raw = formString(value).trim();
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseFormData(formData: FormData, itinerary: unknown[]) {
  // FAQs are flat, so they post as parallel inputs the way page metadata does.
  const questions = formData.getAll("faqQuestion").map(String);
  const answers = formData.getAll("faqAnswer").map(String);
  const faqIds = formData.getAll("faqId").map(String);

  const faqs = questions
    .map((question, index) => ({
      id: faqIds[index] || crypto.randomUUID(),
      question: question.trim(),
      answer: (answers[index] ?? "").trim(),
    }))
    // A row with only one half filled in is an abandoned edit, not content.
    .filter((faq) => faq.question && faq.answer);

  return {
    name: formString(formData.get("name")),
    slug: formString(formData.get("slug")) || formString(formData.get("name")),
    shortDescription: formString(formData.get("shortDescription")),
    description: formString(formData.get("description")),
    featuredImage: formString(formData.get("featuredImage")),
    gallery: formData.getAll("gallery").map(String),

    price: formString(formData.get("price")),
    compareAtPrice: formString(formData.get("compareAtPrice")),
    currency: formString(formData.get("currency")),
    priceNote: formString(formData.get("priceNote")),

    durationDays: formString(formData.get("durationDays")),
    durationNights: formString(formData.get("durationNights")),
    difficulty: formString(formData.get("difficulty")),
    groupSizeMin: formString(formData.get("groupSizeMin")),
    groupSizeMax: formString(formData.get("groupSizeMax")),
    maxAltitude: formString(formData.get("maxAltitude")),

    destinationId: formString(formData.get("destinationId")),
    activityIds: formData.getAll("activityIds").map(String),

    itinerary,
    inclusions: formData.getAll("inclusions").map(String),
    exclusions: formData.getAll("exclusions").map(String),
    highlights: formData.getAll("highlights").map(String),
    faqs,
    bestSeason: formData.getAll("bestSeason").map(String),

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

export async function saveTourAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formString(formData.get("id"));
  const isNew = !id;

  let createdId: string | null = null;

  try {
    const session = await requirePermission(
      isNew ? "tours.create" : "tours.update",
    );

    const itinerary = parseJsonArray(formData.get("itinerary"));
    if (itinerary === null) {
      return actionError("The itinerary could not be read. Please try again.", {
        itinerary: ["The itinerary could not be read. Please try again."],
      });
    }

    const parsed = tourInputWithRulesSchema.safeParse(
      parseFormData(formData, itinerary),
    );
    if (!parsed.success) return toActionState(parsed.error);

    if (parsed.data.status === "published" || parsed.data.status === "scheduled") {
      await requirePermission("tours.publish");
    }

    const tour = isNew
      ? await tours.create(parsed.data, { userId: session.userId })
      : await tours.update(id, parsed.data, { userId: session.userId });

    await activity.record({
      action: isNew ? "created" : "updated",
      entityType: "tours",
      entityId: tour.id,
      entityTitle: tour.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/tours");
    revalidatePath("/", "layout");

    if (isNew) createdId = tour.id;
  } catch (error) {
    return toActionState(error);
  }

  if (createdId) redirect(`/admin/tours/${createdId}`);

  return actionSuccess("Tour saved.");
}

export async function setTourStatusAction(
  id: string,
  status: ContentStatus,
): Promise<ActionState> {
  try {
    const session = await requirePermission(
      status === "trash" ? "tours.delete" : "tours.publish",
    );

    const tour = await tours.setStatus(id, status, { userId: session.userId });

    await activity.record({
      action:
        status === "published"
          ? "published"
          : status === "trash"
            ? "trashed"
            : "unpublished",
      entityType: "tours",
      entityId: tour.id,
      entityTitle: tour.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/tours");
    revalidatePath("/", "layout");
    return actionSuccess("Tour updated.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteTourAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("tours.delete");

    const tour = await tours.get(id);
    if (!tour) return actionError("That tour no longer exists.");

    await tours.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "tours",
      entityId: id,
      entityTitle: tour.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/tours");
    revalidatePath("/", "layout");
    return actionSuccess("Tour deleted.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function duplicateTourAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("tours.create");
    const copy = await tours.duplicate(id, { userId: session.userId });

    await activity.record({
      action: "duplicated",
      entityType: "tours",
      entityId: copy.id,
      entityTitle: copy.name,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/tours");
    return actionSuccess("Tour duplicated.", { id: copy.id });
  } catch (error) {
    return toActionState(error);
  }
}
