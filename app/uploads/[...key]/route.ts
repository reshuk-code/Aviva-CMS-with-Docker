import { open, realpath, type FileHandle } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import { resolveStorage } from "@/lib/connections/resolve";
import { localUploadPathSchema, localUploadRangeSchema } from "@/schemas/local-upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif",
  ".ico": "image/x-icon", ".mp4": "video/mp4", ".m4v": "video/mp4",
  ".webm": "video/webm", ".mov": "video/quicktime", ".ogv": "video/ogg",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
  ".m4a": "audio/mp4", ".pdf": "application/pdf",
};

type Context = { params: Promise<{ key: string[] }> };

// Production Next.js snapshots public/ at startup; new uploads need a live reader.
async function serve(request: Request, context: Context) {
  if (resolveStorage().id !== "local") return new Response(null, { status: 404 });
  const parsed = localUploadPathSchema.safeParse((await context.params).key);
  if (!parsed.success) return new Response(null, { status: 404 });

  let file: FileHandle | undefined;
  try {
    const root = await realpath(path.join(process.cwd(), "public", "uploads"));
    const target = await realpath(path.join(root, ...parsed.data));
    if (!target.startsWith(root + path.sep)) return new Response(null, { status: 404 });
    file = await open(target, "r");
    const stat = await file.stat();
    if (!stat.isFile()) return new Response(null, { status: 404 });

    const mime = mimeTypes[path.extname(target).toLowerCase()];
    const etag = `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
    const headers = new Headers({
      "Content-Type": mime || "application/octet-stream",
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "ETag": etag,
      "Last-Modified": stat.mtime.toUTCString(),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
    });
    if (!mime) headers.set("Content-Disposition", "attachment");
    if (request.headers.get("if-none-match") === etag) {
      headers.delete("Content-Length");
      return new Response(null, { status: 304, headers });
    }
    if (request.method === "HEAD") return new Response(null, { headers });

    let start = 0;
    let end = stat.size - 1;
    let status = 200;
    const range = request.headers.get("range");
    const ifRange = request.headers.get("if-range");
    if (range && (!ifRange || ifRange === etag || ifRange === stat.mtime.toUTCString())) {
      const valid = localUploadRangeSchema.safeParse(range);
      const [first, last] = valid.success ? valid.data.slice(6).split("-") : ["", ""];
      if (first) {
        start = Number(first);
        end = last ? Math.min(Number(last), end) : end;
      } else if (last) {
        start = Math.max(0, stat.size - Number(last));
      }
      if (!valid.success || (!first && !last) || !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) || start < 0 || start > end || start >= stat.size) {
        return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
      }
      status = 206;
      headers.set("Content-Range", `bytes ${start}-${end}/${stat.size}`);
      headers.set("Content-Length", String(end - start + 1));
    }
    if (stat.size === 0) return new Response(null, { headers });
    const stream = file.createReadStream({ start, end, autoClose: true });
    file = undefined;
    return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status, headers });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return new Response(null, { status: 404 });
    console.error("[cms] Could not read local upload:", code);
    return new Response(null, { status: 500 });
  } finally {
    await file?.close();
  }
}

export const GET = serve;
export const HEAD = serve;
