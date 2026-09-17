import { ReactNodeViewRenderer } from "@tiptap/react";
import { VideoNodeView } from "@/components/cms/video-node-view";
import { Node } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import { isSafeImageSrc } from "@/lib/rich-text";

export const EditorVideo = Node.create({
  name: "video",
  group: "block",
  atom: true,
  draggable: true,
  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView, { stopEvent: ({ event }) => event.target instanceof Element && Boolean(event.target.closest("[data-video-player]")) });
  },
  addAttributes() {
    return {
      src: { default: null, parseHTML: (element) => (element.querySelector("video") ?? element).getAttribute("src") },
      title: { default: null, parseHTML: (element) => (element.querySelector("video") ?? element).getAttribute("title") },
      caption: { default: null, parseHTML: (element) => element.getAttribute("data-caption") },
    };
  },
  parseHTML() {
    return ["figure[data-cms-video]", "video[src]"].map((tag) => ({
      tag,
      getAttrs: (element: HTMLElement) => isSafeImageSrc((element.querySelector("video") ?? element).getAttribute("src")) ? {} : false,
    }));
  },
  renderHTML({ node }): DOMOutputSpec {
    const { src, title, caption } = node.attrs;
    const children: DOMOutputSpec[] = [["video", { src, title, controls: "", playsinline: "", preload: "metadata", style: "width: 100%" }]];
    if (caption) children.push(["figcaption", { style: "text-align: left" }, String(caption)]);
    return ["figure", { "data-cms-video": "", "data-caption": caption }, ...children];
  },
});
