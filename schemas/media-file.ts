import { z } from "zod";

const MB = 1024 * 1024;
export const IMAGE_UPLOAD_BYTES = MB;
export const VIDEO_UPLOAD_BYTES = 50 * MB;

export function mediaFileLimit(mimeType: string, filename: string): number {
  if (mimeType.startsWith("image/") || /\.(avif|bmp|gif|heic|heif|ico|jpe?g|png|svg|tiff?|webp)$/i.test(filename)) return IMAGE_UPLOAD_BYTES;
  if (mimeType.startsWith("video/") || /\.(mp4|m4v|mov|webm|avi|mkv|mpeg|mpg|ogv)$/i.test(filename)) return VIDEO_UPLOAD_BYTES;
  return 25 * MB;
}

export const mediaFileSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().max(255),
  size: z.number().int().positive("Choose a non-empty file."),
}).superRefine((file, ctx) => {
  const limit = mediaFileLimit(file.mimeType, file.filename);
  if (file.size > limit) ctx.addIssue({ code: "custom", path: ["size"], message: `${file.filename} exceeds the ${limit / MB} MB limit. Choose a smaller file.` });
});
