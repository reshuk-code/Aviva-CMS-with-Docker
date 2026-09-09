import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A deliberately small Markdown subset renderer.
 *
 * Why not `dangerouslySetInnerHTML` with a Markdown library: editor-authored
 * content is still untrusted input once a client has an Author account, and
 * shipping a parser plus a sanitiser for the MVP is two dependencies and a
 * class of XSS bugs. This produces React elements, so nothing can inject
 * markup — the worst a malformed document can do is render as plain text.
 *
 * Supported: `#`/`##`/`###` headings, `-` bullet lists, `1.` numbered lists,
 * blank-line-separated paragraphs, `**bold**`, `*italic*`, `[text](href)`.
 *
 * Projects that need full rich text can swap this component out; the CMS
 * stores the raw string either way.
 */
export function RichText({ content }: { content: string }) {
  const blocks = parseBlocks(content);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-4">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

type ParsedBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

function parseBlocks(content: string): ParsedBlock[] {
  const chunks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const blocks: ParsedBlock[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      continue;
    }

    const lines = trimmed.split("\n").map((line) => line.trim());

    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      blocks.push({
        kind: "list",
        ordered: false,
        items: lines.map((line) => line.replace(/^[-*]\s+/, "")),
      });
      continue;
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      blocks.push({
        kind: "list",
        ordered: true,
        items: lines.map((line) => line.replace(/^\d+\.\s+/, "")),
      });
      continue;
    }

    blocks.push({ kind: "paragraph", text: lines.join(" ") });
  }

  return blocks;
}

function renderBlock(block: ParsedBlock, key: number): ReactNode {
  switch (block.kind) {
    case "heading": {
      const className =
        block.level === 1
          ? "text-2xl font-semibold tracking-tight"
          : block.level === 2
            ? "text-xl font-semibold tracking-tight"
            : "text-lg font-semibold";

      if (block.level === 1) {
        return (
          <h2 key={key} className={className}>
            {renderInline(block.text)}
          </h2>
        );
      }
      if (block.level === 2) {
        return (
          <h3 key={key} className={className}>
            {renderInline(block.text)}
          </h3>
        );
      }
      return (
        <h4 key={key} className={className}>
          {renderInline(block.text)}
        </h4>
      );
    }

    case "list": {
      const items = block.items.map((item, index) => (
        <li key={index}>{renderInline(item)}</li>
      ));
      return block.ordered ? (
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={key} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      );
    }

    case "paragraph":
      return (
        <p key={key} className="leading-relaxed">
          {renderInline(block.text)}
        </p>
      );
  }
}

/** Tokenises bold, italic and links without ever producing raw HTML. */
function renderInline(text: string): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
  const parts = text.split(pattern).filter((part) => part !== "");

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      // Only http(s) and site-relative links; blocks javascript: URLs.
      const safe = /^https?:\/\//i.test(href) || href.startsWith("/") || href.startsWith("#");
      if (!safe) return <span key={index}>{label}</span>;

      const external = /^https?:\/\//i.test(href);
      return external ? (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2"
        >
          {label}
        </a>
      ) : (
        <Link
          key={index}
          href={href}
          className="text-primary underline underline-offset-2"
        >
          {label}
        </Link>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
