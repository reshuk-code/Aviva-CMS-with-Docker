import { isSafeImageSrc } from "@/lib/rich-text";
import Image from "@tiptap/extension-image";
import type { DOMOutputSpec } from "@tiptap/pm/model";

export const EditorImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...Object.fromEntries(["src", "alt", "title"].map((attribute) => [attribute, { default: null, parseHTML: (element: HTMLElement) => (element.matches("figure") ? element.querySelector("img") : element)?.getAttribute(attribute) ?? null }])),
      caption: { default: null, parseHTML: (element) => element.getAttribute("data-caption") },
      description: { default: null, parseHTML: (element) => element.getAttribute("data-description") },
    };
  },
  parseHTML() {
    return [{ tag: "figure[data-cms-image]", getAttrs: (element) => {
      const img = element.querySelector("img");
      if (!img || !isSafeImageSrc(img.getAttribute("src"))) return false;
      return { src: img.getAttribute("src"), alt: img.getAttribute("alt"), title: img.getAttribute("title") };
    } }, ...(this.parent?.() ?? [])];
  },
  renderHTML({ node }) {
    const { src, alt, title, caption, description } = node.attrs;
    const children: DOMOutputSpec[] = [["img", { src, alt: alt ?? "", ...(title ? { title } : {}) }]];
    if (caption) children.push(["figcaption", { style: "text-align: left" }, String(caption)]);
    if (description) children.push(["p", { class: "image-description" }, String(description)]);
    return ["figure", { "data-cms-image": "", "data-caption": caption, "data-description": description }, ...children];
  },
});
