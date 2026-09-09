import type { ContentRecord, ID } from "./common";
import type { SeoMeta } from "./seo";
import type { PageBody } from "./blocks";

/**
 * A CMS-managed page.
 *
 * `slug` is always stored normalised and leading-slashed ("/about", "/" for the
 * home page) so it can be compared directly against a request pathname.
 */
export interface CmsPage extends ContentRecord {
  title: string;
  slug: string;
  /** Short summary used in listings and as an SEO description fallback. */
  excerpt: string | null;
  body: PageBody;
  featuredImage: string | null;
  parentId: ID | null;
  /** Sort weight within its parent, used by menu builders and page trees. */
  order: number;
  showInNavigation: boolean;
  /** Optional template hint the frontend may honour when rendering. */
  template: string | null;
  seo: SeoMeta;
  /** Free-form key/value metadata for project-specific needs. */
  meta: Record<string, string>;
}

/** A page plus its resolved children, for tree views. */
export interface CmsPageNode extends CmsPage {
  children: CmsPageNode[];
}
