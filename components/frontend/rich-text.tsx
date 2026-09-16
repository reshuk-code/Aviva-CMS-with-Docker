import Link from "next/link";
import type { ReactNode } from "react";

import { isSafeHref, isSafeImageSrc, toRichDoc } from "@/lib/rich-text";
import type { RichNode } from "@/types/rich-text";

/**
 * Renders a stored rich text field.
 *
 * Why this does not use `dangerouslySetInnerHTML`: editor-authored content is
 * still untrusted input once a client has an Author account. This walks the
 * document and builds React elements, so there is no string of markup anywhere
 * in the path and nothing to sanitise. A node type it does not recognise is
 * skipped, the same way the block renderer skips an unregistered block.
 *
 * Takes a plain string because that is what the CMS stores — either a
 * serialised document from the editor or, for anything written before the
 * editor existed, Markdown. `toRichDoc` reads both into one tree, so this file
 * has a single rendering path and callers never had to change.
 */
export function RichText({ content }: { content: string }) {
  const doc = toRichDoc(content);

  // An editor that was opened but never written in stores a document holding
  // one empty paragraph. Rendering that would leave a stray blank paragraph on
  // the page, so treat it as no content at all.
  const hasContent = doc.content.some(
    (node) => node.type !== "paragraph" || (node.content?.length ?? 0) > 0,
  );

  if (!hasContent) return null;

  return (
    <div className="space-y-4">
      {doc.content.map((node, index) => renderNode(node, index))}
    </div>
  );
}

const HEADING_STYLES: Record<number, string> = {
  2: "text-2xl font-semibold tracking-tight",
  3: "text-xl font-semibold tracking-tight",
  4: "text-lg font-semibold",
};

function renderNode(node: RichNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return (
        <p key={key} className="leading-relaxed">
          {renderChildren(node)}
        </p>
      );

    case "heading": {
      const raw = Number(node.attrs?.level);
      // Clamped rather than trusted: the page title owns the only h1, and a
      // document pasted from elsewhere can carry any level at all.
      const level = raw >= 2 && raw <= 4 ? raw : 2;
      const className = HEADING_STYLES[level];
      const children = renderChildren(node);

      if (level === 2) return <h2 key={key} className={className}>{children}</h2>;
      if (level === 3) return <h3 key={key} className={className}>{children}</h3>;
      return <h4 key={key} className={className}>{children}</h4>;
    }

    case "bulletList":
      return (
        <ul key={key} className="list-disc space-y-1 pl-5">
          {renderChildren(node)}
        </ul>
      );

    case "orderedList":
      return (
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {renderChildren(node)}
        </ol>
      );

    case "listItem":
      return <li key={key}>{renderListItem(node)}</li>;

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-l-2 border-border pl-4 italic text-muted-foreground"
        >
          {renderChildren(node)}
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-md bg-muted p-4 text-sm"
        >
          <code>{renderChildren(node)}</code>
        </pre>
      );

    case "image": {
      const src = node.attrs?.src;
      // An unsafe or absent source renders nothing rather than a broken image
      // icon, matching how the Image block handles a missing URL.
      if (!isSafeImageSrc(src)) return null;

      return (
        <figure key={key} className="my-6">
          <div className="overflow-hidden rounded-card bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={typeof node.attrs?.alt === "string" ? node.attrs.alt : ""}
              loading="lazy"
              data-lightbox
              className="w-full object-cover"
            />
          </div>
        </figure>
      );
    }

    case "horizontalRule":
      return <hr key={key} className="border-border" />;

    case "hardBreak":
      return <br key={key} />;

    case "text":
      return renderText(node, key);

    default:
      // Unknown node type: skip it rather than crash the page.
      return null;
  }
}

function renderChildren(node: RichNode): ReactNode[] {
  return (node.content ?? []).map((child, index) => renderNode(child, index));
}

/**
 * A list item wraps its text in a paragraph, which would add block spacing
 * inside the bullet. Unwrap a lone paragraph so a list looks like a list.
 */
function renderListItem(node: RichNode): ReactNode {
  const children = node.content ?? [];
  if (children.length === 1 && children[0].type === "paragraph") {
    return renderChildren(children[0]);
  }
  return renderChildren(node);
}

function renderText(node: RichNode, key: number): ReactNode {
  if (!node.text) return null;

  let element: ReactNode = node.text;

  // Applied outermost-last so nesting order is stable regardless of the order
  // the editor happened to record the marks in.
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "underline":
        element = <u>{element}</u>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "code":
        element = (
          <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]">
            {element}
          </code>
        );
        break;
      case "link": {
        const href = mark.attrs?.href;
        // An unsafe href (javascript:, data:) degrades to plain text rather
        // than becoming a link that does something the editor did not intend.
        if (!isSafeHref(href)) break;

        const className = "text-primary underline underline-offset-2";
        element = /^https?:\/\//i.test(href) ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {element}
          </a>
        ) : (
          <Link href={href} className={className}>
            {element}
          </Link>
        );
        break;
      }
    }
  }

  return <span key={key}>{element}</span>;
}
