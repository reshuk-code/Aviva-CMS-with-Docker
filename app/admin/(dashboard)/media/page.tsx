import { Image as ImageIcon } from "lucide-react";

import { MediaFilters } from "@/app/admin/(dashboard)/media/media-filters";
import { MediaGrid } from "@/app/admin/(dashboard)/media/media-grid";
import { UploadZone } from "@/app/admin/(dashboard)/media/upload-zone";
import { PageHeader } from "@/components/cms/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/table";
import { requirePermission } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { media } from "@/lib/cms/repositories/media";
import { getStorage } from "@/lib/storage";
import { mediaListOptionsSchema } from "@/schemas/media";

export const metadata = { title: "Media" };

/**
 * Media library.
 *
 * Files live with the storage adapter (`CMS_STORAGE`), their metadata with the
 * database adapter — the two are configured independently, so a project can
 * keep content in Neon and images in Supabase Storage.
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission("media.read");
  const params = await searchParams;

  const options = mediaListOptionsSchema.parse({
    page: params.page,
    perPage: params.perPage,
    search: params.search,
    kind: params.kind,
    folder: params.folder,
  });

  const [result, folders, storage] = await Promise.all([
    media.list(options),
    media.folders(),
    getStorage(),
  ]);

  const canCreate = hasPermission({ role: session.role }, "media.create");
  const canUpdate = hasPermission({ role: session.role }, "media.update");
  const canDelete = hasPermission({ role: session.role }, "media.delete");

  const filtered =
    Boolean(options.search) || options.kind !== "any" || Boolean(options.folder);

  return (
    <>
      <PageHeader
        title="Media"
        description={`Images and files used across the site. Stored with the ${storage.provider} provider.`}
      />

      <div className="space-y-5">
        {canCreate ? (
          <UploadZone
            folders={folders}
            maxUploadMb={Math.round(storage.maxUploadBytes / 1024 / 1024)}
          />
        ) : null}

        <Card>
          <CardHeader
            title="Library"
            description={`${result.total} file${result.total === 1 ? "" : "s"}`}
          />

          <MediaFilters folders={folders} />

          {result.items.length === 0 ? (
            <EmptyState
              icon={<ImageIcon className="size-8" />}
              title={filtered ? "Nothing matches those filters" : "No files yet"}
              description={
                filtered
                  ? "Try a different search term, type or folder."
                  : canCreate
                    ? "Upload an image above, then paste its URL into a page — or pick it with the Choose button on any image field."
                    : "Files uploaded by your team will appear here."
              }
            />
          ) : (
            <MediaGrid
              items={result.items}
              folders={folders}
              canUpdate={canUpdate}
              canDelete={canDelete}
            />
          )}

          <Pagination
            result={result}
            basePath="/admin/media"
            searchParams={{
              search: options.search || undefined,
              kind: options.kind === "any" ? undefined : options.kind,
              folder: options.folder || undefined,
            }}
          />
        </Card>
      </div>
    </>
  );
}
