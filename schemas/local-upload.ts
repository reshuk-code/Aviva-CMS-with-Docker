import { z } from "zod";

export const localUploadPathSchema = z.array(
  z.string().min(1).max(255).refine(
    (segment) => !segment.startsWith(".") && !/[\\/\x00-\x1f]/.test(segment),
    "Invalid upload path.",
  ),
).min(1).max(16);

export const localUploadRangeSchema = z.string().max(100).regex(/^bytes=\d*-\d*$/);
