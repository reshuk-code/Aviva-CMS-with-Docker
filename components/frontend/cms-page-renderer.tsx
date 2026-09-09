import { RichText } from "@/components/frontend/rich-text";
import { RICH_TEXT_BLOCK } from "@/lib/cms/blocks";
import type { CmsPage } from "@/types/page";

/**
 * Default renderer for a CMS page.
 *
 * This is a *starting point*, not a requirement. A project is free to delete
 * this component and render `page.body` however it likes, or to hand-write a
 * route for any page it wants full control over (§20).
 *
 * Phase 1 understands the `rich-text` block. Unknown block types are skipped
 * rather than crashing the page, so adding a block in Phase 3 cannot break a
 * site that has not updated its renderer.
 */
export function CmsPageRenderer({ page }: { page: CmsPage }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-16">
      <header className="mb-8 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        {page.excerpt ? (
          <p className="text-lg text-muted-foreground">{page.excerpt}</p>
        ) : null}
      </header>

      {page.featuredImage ? (
        // A plain <img>: the image URL comes from the CMS and may point at any
        // storage adapter, so next/image would need per-project remotePatterns.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.featuredImage}
          alt=""
          className="mb-8 w-full rounded-lg border border-border object-cover"
        />
      ) : null}

      {page.body.map((block) => {
        if (block.type === RICH_TEXT_BLOCK) {
          const content =
            typeof block.props.content === "string" ? block.props.content : "";
          return <RichText key={block.id} content={content} />;
        }
        return null;
      })}
    </article>
  );
}
