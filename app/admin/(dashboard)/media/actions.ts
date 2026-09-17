"use server";

import { mediaFileSchema, IMAGE_UPLOAD_BYTES } from "@/schemas/media-file";
import { ValidationError } from "@/lib/cms/errors";
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
import { getStorage, mediaKindFor } from "@/lib/storage";
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
/**
 * Stores one image dropped or pasted into the rich text editor.
 *
 * Separate from `uploadMediaAction` for two reasons: it returns the stored URL
 * so the editor can insert it, and it accepts images only. The library itself
 * takes documents, audio and video too, so the narrower rule belongs here
 * rather than in the shared upload path.
 */
async function storeEditorImage(
  filename: string,
  mimeType: string,
  body: ArrayBuffer,
): Promise<ActionState> {
  const session = await requirePermission("media.create");

  if (mediaKindFor(mimeType) !== "image") {
    return actionError("Only images can be placed in the editor.");
  }

  const storage = await getStorage();
  const validation = mediaFileSchema.safeParse({ filename, mimeType, size: body.byteLength });
  if (!validation.success) return actionError(validation.error.issues[0].message);
  if (body.byteLength > storage.maxUploadBytes) {
    const limitMb = Math.round(storage.maxUploadBytes / 1024 / 1024);
    return actionError(`That image is larger than the ${limitMb}MB limit.`);
  }

  const item = await media.upload({
    filename,
    mimeType,
    body,
    // No folder on purpose: the storage key then files it by date, the same
    // as any other upload that was not deliberately grouped.
    uploadedBy: session.userId,
  });

  if (!item.reused) await activity.record({
    action: "created",
    entityType: "media",
    entityId: item.id,
    entityTitle: item.filename,
    userId: session.userId,
    userName: session.name,
  });

  revalidatePath("/admin/media");

  return actionSuccess(`${item.reused ? "Reused" : "Uploaded"} ${item.filename}.`, {
    url: item.url,
    alt: item.altText ?? "",
    caption: item.caption ?? "",
    description: item.description ?? "",
    filename: item.filename,
  });
}

export async function uploadEditorImageAction(
  formData: FormData,
): Promise<ActionState> {
  try {
    await requirePermission("media.create");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return actionError("That file could not be read.");
    }

    const validation = mediaFileSchema.safeParse({ filename: file.name, mimeType: file.type, size: file.size });
    if (!validation.success) return actionError(validation.error.issues[0].message);
    return await storeEditorImage(
      file.name || "pasted-image",
      file.type,
      await file.arrayBuffer(),
    );
  } catch (error) {
    return toActionState(error);
  }
}

/** Addresses that must never be reachable through a pasted image URL. */
function isPrivateAddress(address: string): boolean {
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    return (
      lower === "::1" ||
      lower === "::" ||
      lower.startsWith("fe80") ||
      lower.startsWith("fc") ||
      lower.startsWith("fd")
    );
  }

  return [
    /^0\./,
    /^10\./,
    /^127\./,
    /^169\.254\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
  ].some((range) => range.test(address));
}

/**
 * Copies an image pasted as a remote URL into the media library.
 *
 * The copy is the point: a hotlinked image breaks the day the other site moves
 * or blocks it, and this CMS has no way to notice.
 *
 * Fetching a URL an editor supplies is a server-side request forgery risk, so
 * the host is resolved first and refused if it points anywhere internal. A
 * determined attacker could still win a DNS rebinding race between this check
 * and the fetch; closing that needs connecting by resolved IP with a pinned
 * Host header, which is more machinery than a paste handler warrants. The blast
 * radius is bounded: only an authenticated editor reaches this, the response
 * must be an image, and its bytes are never echoed back to the caller.
 */
export async function uploadEditorImageFromUrlAction(
  source: string,
): Promise<ActionState> {
  try {
    await requirePermission("media.create");

    let parsed: URL;
    try {
      parsed = new URL(source);
    } catch {
      return actionError("That image address is not a valid URL.");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return actionError("Only http and https images can be copied.");
    }

    const { lookup } = await import("node:dns/promises");
    const resolved = await lookup(parsed.hostname, { all: true }).catch(
      () => [],
    );

    if (resolved.length === 0) {
      return actionError("That image address could not be resolved.");
    }

    if (resolved.some((entry) => isPrivateAddress(entry.address))) {
      return actionError("That image address is not reachable.");
    }

    const response = await fetch(parsed, { redirect: "error" });
    if (!response.ok) {
      return actionError("That image could not be downloaded.");
    }

    const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (mediaKindFor(mimeType) !== "image") {
      return actionError("That address is not an image.");
    }

    const filename = parsed.pathname.split("/").pop() || "pasted-image";
    return await storeEditorImage(filename, mimeType, await readImageBody(response));
  } catch (error) {
    return toActionState(error);
  }
}

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

    for (const file of files) {
      const validation = mediaFileSchema.safeParse({ filename: file.name, mimeType: file.type, size: file.size });
      if (!validation.success) return actionError(validation.error.issues[0].message, { files: [validation.error.issues[0].message] });
    }
    const oversized = files.filter((file) => file.size > storage.maxUploadBytes);
    if (oversized.length > 0) {
      return actionError(
        `${oversized[0].name} is larger than the ${limitMb}MB limit.`,
        { files: [`Each file must be ${limitMb}MB or smaller.`] },
      );
    }

    let reusedCount = 0;
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

      if (item.reused) reusedCount++;
      if (!item.reused) await activity.record({
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
        ? `${reusedCount ? "Reused existing" : "Uploaded"} ${files[0].name}.`
        : `Added ${files.length - reusedCount} files; reused ${reusedCount} existing files.`,
      { reused: String(reusedCount) },
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

async function readImageBody(response: Response): Promise<ArrayBuffer> {
  if (Number(response.headers.get("content-length")) > IMAGE_UPLOAD_BYTES) {
    await response.body?.cancel();
    throw new ValidationError("That image exceeds the 1 MB limit.");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ValidationError("That image could not be downloaded.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > IMAGE_UPLOAD_BYTES) {
        await reader.cancel();
        throw new ValidationError("That image exceeds the 1 MB limit.");
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return body.buffer;
}
