import "server-only";

import type { StorageAdapter } from "../adapter";

/**
 * S3-compatible storage (AWS S3, Cloudflare R2, DigitalOcean Spaces) —
 * STATUS: NOT IMPLEMENTED. Phase 4 (docs/ROADMAP.md).
 *
 * Implementation notes: use `@aws-sdk/client-s3` (not a dependency of this
 * template — install it in the project that needs it) with a presigned PUT for
 * browser uploads so large files never pass through the Next.js server.
 * Env vars are already reserved in .env.example: STORAGE_S3_*.
 */
const NOT_IMPLEMENTED =
  'The S3 storage adapter is not implemented yet. Use storage: "local" or ' +
  '"supabase" in cms.config.ts. See docs/ROADMAP.md (Phase 4).';

export function createS3StorageAdapter(): StorageAdapter {
  return {
    provider: "s3",
    maxUploadBytes: 0,

    async upload() {
      throw new Error(NOT_IMPLEMENTED);
    },

    async delete() {
      throw new Error(NOT_IMPLEMENTED);
    },

    async getUrl() {
      throw new Error(NOT_IMPLEMENTED);
    },
  };
}
