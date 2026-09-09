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
import { media } from "@/lib/cms/repositories/media";
import { getStorage } from "@/lib/storage";
import { mediaUpdateSchema, mediaUploadSchema } from "@/schemas/media";

/**
 * Media library actions.
 *
 * Uploads arrive as a Server Action rather than a route handler so the same
 * permission guard, error shape and revalidation as every other admin mutation
 * apply. Next streams the multipart body into `formData()`, so nothing here
 * buffers the whole request by hand — but each file does become a Buffer for
 * the storage adapter, which is why the per-file size cap is enforced.
 */
export async function uploadMediaAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission("media.create");

    const parsed = mediaUploadSchema.safeParse({
      folder: formString(formData.get("folder")),
      altText: formString(formData.get("altText")),
    });

    if (!parsed.success) return toActionState(parsed.error);

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (files.length === 0) {
      return actionError("Choose at least one file to upload.", {
        files: ["Choose at least one file to upload."],
      });
    }

    const storage = await getStorage();
    const limitMb = Math.round(storage.maxUploadBytes / 1024 / 1024);

    const oversized = files.filter((file) => file.size > storage.maxUploadBytes);
    if (oversized.length > 0) {
      return actionError(
        `${oversized[0].name} is larger than the ${limitMb}MB limit.`,
        { files: [`Each file must be ${limitMb}MB or smaller.`] },
      );
    }

    // Sequential on purpose: parallel uploads of a whole folder of photos will
    // exhaust a serverless function's memory long before they save any time.
    for (const file of files) {
      const item = await media.upload({
        filename: file.name,
        mimeType: file.type,
        body: await file.arrayBuffer(),
        folder: parsed.data.folder,
        altText: files.length === 1 ? parsed.data.altText : null,
        uploadedBy: session.userId,
      });

      await activity.record({
        action: "created",
        entityType: "media",
        entityId: item.id,
        entityTitle: item.filename,
        userId: session.userId,
        userName: session.name,
      });
    }

    revalidatePath("/admin/media");

    return actionSuccess(
      files.length === 1
        ? `Uploaded ${files[0].name}.`
        : `Uploaded ${files.length} files.`,
    );
  } catch (error) {
    return toActionState(error);
  }
}

export async function updateMediaAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await requirePermission("media.update");

    const id = formString(formData.get("id"));
    if (!id) return actionError("Missing media id.");

    const parsed = mediaUpdateSchema.safeParse({
      altText: formString(formData.get("altText")),
      caption: formString(formData.get("caption")),
      description: formString(formData.get("description")),
      folder: formString(formData.get("folder")),
    });

    if (!parsed.success) return toActionState(parsed.error);

    const item = await media.update(id, parsed.data);

    await activity.record({
      action: "updated",
      entityType: "media",
      entityId: item.id,
      entityTitle: item.filename,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/media");

    return actionSuccess("Details saved.");
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteMediaAction(id: string): Promise<ActionState> {
  try {
    const session = await requirePermission("media.delete");

    const item = await media.get(id);
    if (!item) return actionError("That file no longer exists.");

    await media.delete(id);

    await activity.record({
      action: "deleted",
      entityType: "media",
      entityId: id,
      entityTitle: item.filename,
      userId: session.userId,
      userName: session.name,
    });

    revalidatePath("/admin/media");

    return actionSuccess("File deleted.");
  } catch (error) {
    return toActionState(error);
  }
}
