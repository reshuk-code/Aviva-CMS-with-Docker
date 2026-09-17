"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

/** Keep prose and preformatted text intact; only indent structural containers. */
export function formatEditorHtml(html: string): string {
  const body = new DOMParser().parseFromString(html, "text/html").body;
  const containers = new Set(["UL", "OL", "LI", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH", "FIGURE", "DIV"]);
  function format(node: Node, depth: number): string {
    const indent = "  ".repeat(depth);
    if (node.nodeType === Node.COMMENT_NODE) return `${indent}<!--${node.textContent ?? ""}-->`;
    if (!(node instanceof Element)) {
      const escaped = document.createElement("span");
      escaped.textContent = node.textContent;
      return indent + escaped.innerHTML;
    }
    const children = [...node.childNodes];
    const blocks = new Set([...containers, "P", "H2", "H3", "H4", "PRE", "HR", "IMG", "VIDEO", "FIGCAPTION"]);
    if (!containers.has(node.tagName) || children.some((child) =>
      (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) ||
      (child instanceof Element && !blocks.has(child.tagName)))) {
      return indent + node.outerHTML;
    }
    const shell = node.cloneNode(false) as Element;
    const opening = shell.outerHTML.slice(0, shell.outerHTML.indexOf("></") + 1);
    if (!opening || !children.length) return indent + node.outerHTML;
    return `${indent}${opening}\n${children.filter((child) => child.nodeType !== Node.TEXT_NODE || child.textContent?.trim()).map((child) => format(child, depth + 1)).join("\n")}\n${indent}</${node.tagName.toLowerCase()}>`;
  }
  return [...body.childNodes].map((node) => format(node, 0)).join("\n");
}

export function HtmlCodeEditor({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const overlay = useRef<HTMLPreElement>(null);
  const tokens = value.split(/(<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>)/g);
  return <div className="space-y-2 p-3">
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-xs font-medium">{label} HTML</label>
      <Button type="button" size="sm" variant="outline" onClick={() => onChange(formatEditorHtml(value))}>Format HTML</Button>
    </div>
    <div className="relative h-[26rem] overflow-hidden rounded-md border bg-background font-mono text-sm leading-6">
      <pre ref={overlay} aria-hidden="true" className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre p-4 font-mono text-sm leading-6">
        {tokens.map((token, index) => token.startsWith("<!--")
          ? <span key={index} className="text-muted-foreground">{token}</span>
          : token.startsWith("<")
            ? <span key={index} className="text-blue-700 dark:text-blue-300">{token.split(/("[^"]*"|'[^']*')/g).map((part, partIndex) => <span key={partIndex} className={/^["']/.test(part) ? "text-emerald-700 dark:text-emerald-300" : undefined}>{part}</span>)}</span>
            : <span key={index}>{token}</span>)}{"\n"}
      </pre>
      <textarea id={id} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off"
        className="absolute inset-0 h-full w-full resize-none whitespace-pre bg-transparent p-4 font-mono text-sm leading-6 text-transparent caret-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={value} onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => { if (overlay.current) { overlay.current.scrollTop = event.currentTarget.scrollTop; overlay.current.scrollLeft = event.currentTarget.scrollLeft; } }}
        onKeyDown={(event) => {
          if (event.key !== "Tab" || event.shiftKey) return;
          event.preventDefault();
          const input = event.currentTarget;
          const start = input.selectionStart;
          onChange(value.slice(0, start) + "  " + value.slice(input.selectionEnd));
          requestAnimationFrame(() => input.setSelectionRange(start + 2, start + 2));
        }} />
    </div>
    <p className="text-xs text-muted-foreground">Tab indents; Shift+Tab leaves the editor. Only supported HTML formatting is saved.</p>
  </div>;
}
