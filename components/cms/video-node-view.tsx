"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { VideoPlayer } from "@/components/ui/video-player";

export function VideoNodeView({ node, editor, getPos, selected }: NodeViewProps) {
  return <NodeViewWrapper contentEditable={false} className={`my-4 rounded-xl ${selected ? "ring-2 ring-primary" : ""}`}>
    <button type="button" className="mb-2 text-xs text-primary underline" onClick={() => {
      const position = getPos();
      if (typeof position === "number") editor.commands.setNodeSelection(position);
    }}>Edit video details</button>
    <VideoPlayer caption={typeof node.attrs.caption === "string" ? node.attrs.caption : undefined} src={String(node.attrs.src ?? "")} title={typeof node.attrs.title === "string" ? node.attrs.title : undefined} />
    {node.attrs.caption && <p className="mt-2 text-left text-sm text-muted-foreground">{String(node.attrs.caption)}</p>}
  </NodeViewWrapper>;
}
