"use client";

import { HtmlCodeEditor, formatEditorHtml } from "@/components/cms/html-code-editor";
import { EditorVideo } from "@/components/cms/editor-video";
import { Video } from "lucide-react";
import { mediaFileSchema } from "@/schemas/media-file";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Placeholder } from "@tiptap/extensions";
import { EditorImage } from "@/components/cms/editor-image";
import { TableKit } from "@tiptap/extension-table";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import {
  uploadEditorImageAction,
  uploadEditorImageFromUrlAction,
} from "@/app/admin/(dashboard)/media/actions";
import { readMediaDragData } from "@/components/cms/media-drag";
import { MediaPicker } from "@/components/cms/media-picker";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import {
  isSafeHref,
  isSafeImageSrc,
  richDocToPlainText,
  toEditableRichDoc,
  toRichDoc,
} from "@/lib/rich-text";
import { RICH_HEADING_LEVELS } from "@/types/rich-text";

/**
 * The rich text editor used by every prose field in the admin.
 *
 * Stores a serialised ProseMirror document rather than HTML. That keeps the
 * promise the frontend renderer makes — content becomes React elements, never
 * markup — so the CMS still ships no HTML parser and no sanitiser, and an
 * Author cannot inject anything by pasting.
 *
 * Legacy Markdown is read on load and converted to the same document, so a
 * field written before this editor existed opens formatted rather than showing
 * its asterisks. Nothing is rewritten until the editor actually saves.
 *
 * Like ImageField and GalleryField, this owns its state and posts a hidden
 * input, so the surrounding form stays a plain `FormData` read.
 */

/** Block types offered in the style menu. Order is the order on screen. */
const BLOCK_STYLES = [
  { label: "Paragraph", level: null },
  ...RICH_HEADING_LEVELS.map((level) => ({ label: `Heading ${level}`, level })),
] as const;

/** A pasted address that is worth trying to fetch as an image. */
const IMAGE_URL = /^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif|svg)(\?\S*)?$/i;

export function RichTextField({
  id,
  name,
  label,
  hideLabel = false,
  hint,
  error,
  defaultValue = "",
  placeholder = "Write something, or paste from a document…",
  onValueChange,
}: {
  id: string;
  name: string;
  label: string;
  /** The forms give each editor a visible Card header already. */
  hideLabel?: boolean;
  hint?: ReactNode;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  /** Mirrors the value out for the block editor, which posts its own JSON. */
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(() =>
    JSON.stringify(toEditableRichDoc(defaultValue)),
  );
  // Bumped when the selection moves so the toolbar's active states refresh.
  // A counter rather than an effect: the lint rule against setState-in-effect
  // is on for a reason, and this is an event callback.
  const [, setTick] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);

  // The paste and drop handlers are built with the editor, so they cannot close
  // over the `editor` const this hook is still returning. A ref set on create
  // gives them a stable way to reach it.
  const editorRef = useRef<Editor | null>(null);

  function insertImage(src: string, alt: string, at?: number, metadata: { caption?: string | null; description?: string | null } = {}) {
    const editor = editorRef.current;
    if (!editor) return;

    const node = { type: "image", attrs: { src, alt, ...metadata } };
    if (typeof at === "number") {
      editor.chain().focus().insertContentAt(at, node).run();
    } else {
      editor.chain().focus().insertContent(node).run();
    }
  }

  async function uploadFiles(files: File[], at?: number) {
    setUploading(true);
    try {
      // Sequential, like the media library's own upload: a dropped folder of
      // photographs should not open a dozen simultaneous uploads.
      for (const file of files) {
        const validation = mediaFileSchema.safeParse({ filename: file.name, mimeType: file.type, size: file.size });
        if (!validation.success) { toast.error(validation.error.issues[0].message); continue; }
        const data = new FormData();
        data.set("file", file);

        const result = await uploadEditorImageAction(data);
        if (!result.ok || !result.data?.url) {
          toast.error(result.message ?? "That image could not be uploaded.");
          continue;
        }

        insertImage(result.data.url, result.data.alt ?? "", at, { caption: result.data.caption, description: result.data.description });
      }
    } finally {
      setUploading(false);
    }
  }

  async function uploadFromUrl(source: string) {
    setUploading(true);
    try {
      const result = await uploadEditorImageFromUrlAction(source);
      if (!result.ok || !result.data?.url) {
        toast.error(result.message ?? "That image could not be copied.");
        return;
      }
      insertImage(result.data.url, result.data.alt ?? "", undefined, { caption: result.data.caption, description: result.data.description });
    } finally {
      setUploading(false);
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [...RICH_HEADING_LEVELS] },
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
      // Base64 is refused deliberately: a pasted screenshot arrives as a data
      // URI, and embedding one would put megabytes in a database row and break
      // the size cap on save. Images are uploaded and referenced by URL.
      EditorVideo,
      EditorImage.configure({ allowBase64: false }),
      TableKit.configure({ table: { HTMLAttributes: { style: "width: 100%" } } }),
    ],
    content: toEditableRichDoc(defaultValue),
    // Next renders this on the server first; rendering the editor immediately
    // would mismatch on hydration.
    immediatelyRender: false,
    onCreate({ editor }) {
      editorRef.current = editor;
    },
    editorProps: {
      attributes: {
        id,
        "aria-invalid": error ? "true" : "false",
        class:
          "tiptap min-h-[26rem] w-full px-6 py-5 text-base leading-[1.75] outline-none [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-lg [&_h4]:font-semibold [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_pre]:my-4 [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-sm [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.9em] [&_hr]:my-6 [&_hr]:border-border [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_img]:my-4 [&_img]:rounded-md [&_img]:max-w-full [&_img.ProseMirror-selectednode]:outline [&_img.ProseMirror-selectednode]:outline-2 [&_img.ProseMirror-selectednode]:outline-[var(--ring)]",
      },
      handleKeyDown(_view, event) {
        // Ctrl/Cmd+K is the link shortcut everywhere else; without this it is
        // the browser's search bar and the editor looks broken.
        if ((event.metaKey || event.ctrlKey) && event.key === "k") {
          event.preventDefault();
          setLinkOpen(true);
          return true;
        }
        return false;
      },
      handlePaste(_view, event) {
        if (/<table[\s>]/i.test(event.clipboardData?.getData("text/html") ?? "")) return false;
        const files = [...(event.clipboardData?.files ?? [])].filter((file) =>
          file.type.startsWith("image/"),
        );

        if (files.length > 0) {
          event.preventDefault();
          void uploadFiles(files);
          return true;
        }

        // An image copied from another site arrives as its address. Copying it
        // into the media library means it cannot break when that site changes.
        const text = event.clipboardData?.getData("text/plain")?.trim();
        if (text && IMAGE_URL.test(text)) {
          event.preventDefault();
          void uploadFromUrl(text);
          return true;
        }

        return false;
      },
      handleDrop(view, event) {
        const dropped = event as DragEvent;
        const files = [...(dropped.dataTransfer?.files ?? [])].filter((file) =>
          file.type.startsWith("image/"),
        );

        // Drop where the pointer is, not where the caret happened to be.
        const at = view.posAtCoords({
          left: dropped.clientX,
          top: dropped.clientY,
        })?.pos;

        // Files are checked first on purpose: a drag from the desktop can also
        // advertise text/uri-list, and testing the library payload first would
        // insert a link to a file that was never uploaded.
        if (files.length === 0) {
          const payload = readMediaDragData(dropped.dataTransfer);
          if (!payload || !isSafeImageSrc(payload.url)) return false;

          // Already in the library, so it is placed rather than uploaded.
          event.preventDefault();
          insertImage(payload.url, payload.alt, at);
          return true;
        }

        event.preventDefault();
        void uploadFiles(files, at);
        return true;
      },
    },
    onUpdate({ editor }) {
      const next = JSON.stringify(editor.getJSON());
      setValue(next);
      onValueChange?.(next);
    },
    onSelectionUpdate() {
      setTick((tick) => tick + 1);
    },
  });

  // Escape leaves full screen. Registered on the window because focus may be
  // on the editor, the toolbar or the link box when it is pressed.
  useEffect(() => {
    if (!fullscreen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFullscreen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen]);

  function openLink() {
    const href = editor?.getAttributes("link").href;
    setLinkHref(typeof href === "string" ? href : "");
    setLinkOpen((open) => !open);
  }

  function applyLink() {
    if (!editor) return;

    const href = linkHref.trim();
    if (!isSafeHref(href)) return;

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    setLinkHref("");
    setLinkOpen(false);
  }

  const activeStyle =
    BLOCK_STYLES.find(
      (style) =>
        style.level !== null && editor?.isActive("heading", { level: style.level }),
    ) ?? BLOCK_STYLES[0];

  const imageSelected = Boolean(editor?.isActive("image"));
  const [pickingKind, setPickingKind] = useState<"image" | "video">("image");
  const [mode, setMode] = useState<"view" | "code">("view");
  const [html, setHtml] = useState("");

  // Counted from the document rather than from Tiptap's own counter, so this
  // number is the one the blog uses for reading time. A footer that disagrees
  // with the published "3 min read" is worse than no footer at all.
  const plainText = richDocToPlainText(toRichDoc(value));
  const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  const characters = plainText.length;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-50 overflow-y-auto bg-background p-4 sm:p-8"
          : "space-y-1.5"
      }
    >
      <Label
        htmlFor={id}
        className={hideLabel && !fullscreen ? "sr-only" : undefined}
      >
        {label}
      </Label>

      <input type="hidden" name={name} value={value} />

      {/*
        No `overflow-hidden` here: it would clip nothing visible but would stop
        the toolbar sticking, because a clipping ancestor is not a scroll
        container for `position: sticky`.
      */}
      <div
        // The editable surface sets `outline-none`, which would otherwise beat
        // the global :focus-visible rule and leave keyboard users with no
        // indication at all. The border carries the focus treatment instead.
        className={`cms-editor mx-auto rounded-md border bg-card focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--ring)] ${
          fullscreen ? "max-w-4xl" : ""
        } ${error ? "border-destructive" : "border-input"}`}
      >
        {/*
          Solid, not `bg-card/95 backdrop-blur`. A backdrop filter on a sticky
          element makes the compositor re-sample and re-blur everything behind
          it on every frame of every scroll, which is what made the admin
          stutter and then catch up. At 95% opacity the blur was barely visible
          anyway.
        */}
        <div className={`${mode === "code" ? "hidden" : "flex"} sticky top-0 z-10 flex-wrap items-center gap-0.5 rounded-t-md border-b border-border bg-card px-2 py-1.5`}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!editor}
                onMouseDown={(event) => event.preventDefault()}
                className="h-8 min-w-32 justify-between gap-1 px-2 font-normal"
              >
                {activeStyle.label}
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={4}
                className="z-50 w-44 rounded-md border border-border bg-card p-1 shadow-lg"
              >
                {BLOCK_STYLES.map((style) => (
                  <DropdownMenu.Item
                    key={style.label}
                    className="flex cursor-pointer items-center justify-between rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
                    onSelect={() =>
                      style.level === null
                        ? editor?.chain().focus().setParagraph().run()
                        : editor
                            ?.chain()
                            .focus()
                            .toggleHeading({ level: style.level })
                            .run()
                    }
                  >
                    {style.label}
                    {activeStyle.label === style.label ? (
                      <Check className="size-3.5" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <Separator />

          <ToolbarButton
            editor={editor}
            label="Bold"
            shortcut="Ctrl+B"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Italic"
            shortcut="Ctrl+I"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Underline"
            shortcut="Ctrl+U"
            active={editor?.isActive("underline")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Strikethrough"
            active={editor?.isActive("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-4" />
          </ToolbarButton>

          {/*
            Bold and friends stay on until switched off, the way every word
            processor behaves. This is the escape hatch: it strips every mark
            from the selection at once, so getting back to plain text never
            means starting a new line.
          */}
          <ToolbarButton
            editor={editor}
            label="Clear formatting"
            onClick={() => editor?.chain().focus().unsetAllMarks().run()}
          >
            <RemoveFormatting className="size-4" />
          </ToolbarButton>

          <Separator />

          <ToolbarButton
            editor={editor}
            label="Bullet list"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Numbered list"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Quote"
            active={editor?.isActive("blockquote")}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Code"
            active={editor?.isActive("code")}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Divider"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="size-4" />
          </ToolbarButton>

          <Separator />

          <ToolbarButton
            editor={editor}
            label="Insert image"
            active={imageSelected}
            onClick={() => { setPickingKind("image"); setPicking(true); }}
          >
            <ImagePlus className="size-4" />
          </ToolbarButton>
          <ToolbarButton editor={editor} label="Insert video" active={editor?.isActive("video")} onClick={() => { setPickingKind("video"); setPicking(true); }}><Video className="size-4" /></ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Add link"
            shortcut="Ctrl+K"
            active={editor?.isActive("link")}
            onClick={openLink}
          >
            <Link2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Remove link"
            onClick={() => editor?.chain().focus().unsetLink().run()}
          >
            <Link2Off className="size-4" />
          </ToolbarButton>

          <Separator />

          <ToolbarButton
            editor={editor}
            label="Undo"
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 className="size-4" />
          </ToolbarButton>

          <ToolbarButton
            editor={editor}
            label="Redo"
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 className="size-4" />
          </ToolbarButton>

          <div className="ml-auto">
            <ToolbarButton
              editor={editor}
              label={fullscreen ? "Exit full screen" : "Full screen"}
              active={fullscreen}
              onClick={() => setFullscreen((open) => !open)}
            >
              {fullscreen ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </ToolbarButton>
          </div>
        </div>

        {linkOpen ? (
          <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-2 py-1.5">
            <Input
              value={linkHref}
              onChange={(event) => setLinkHref(event.target.value)}
              placeholder="/contact or https://example.com"
              className="h-8"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setLinkOpen(false);
                  return;
                }
                if (event.key !== "Enter") return;
                // Enter inside a nested control would otherwise submit the
                // whole content form.
                event.preventDefault();
                applyLink();
              }}
            />
            <Button type="button" size="sm" onClick={applyLink}>
              Link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLinkOpen(false)}
            >
              Cancel
            </Button>
          </div>
        ) : null}

        {/*
          Alt text is edited where the image is selected rather than in a
          dialog, because an image with no description is the single most
          common accessibility fault in a CMS and it should be one click away.
        */}
        {editor?.isActive("video") && mode === "view" && <div className="grid gap-3 border-b p-3 sm:grid-cols-2">
          {(["title", "caption"] as const).map((attribute) => <div key={attribute}>
            <Label htmlFor={id + "-video-" + attribute}>Video {attribute} (optional)</Label>
            <Input id={id + "-video-" + attribute} value={String(editor.getAttributes("video")[attribute] ?? "")} onChange={(event) => editor.commands.updateAttributes("video", { [attribute]: event.target.value })} />
          </div>)}
        </div>}
        {imageSelected && mode === "view" ? (
          <div className="grid gap-3 border-b bg-muted/30 p-3 sm:grid-cols-2">
            {([
              ["alt", "Alt text", "Describe the image for screen readers"],
              ["title", "Title", "Shown as a tooltip"],
              ["caption", "Caption", "Shown below the image"],
              ["description", "Description", "Additional context below the caption"],
            ] as const).map(([attribute, title, placeholder]) => (
              <div key={attribute} className="space-y-1">
                <Label htmlFor={id + "-image-" + attribute}>{title} (optional)</Label>
                <Input id={id + "-image-" + attribute} placeholder={placeholder}
                  value={String(editor?.getAttributes("image")[attribute] ?? "")}
                  onChange={(event) => editor?.commands.updateAttributes("image", { [attribute]: event.target.value })} />
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 border-b p-2">
          <Button type="button" size="sm" variant={mode === "view" ? "primary" : "outline"} aria-pressed={mode === "view"} onClick={() => setMode("view")}>View</Button>
          <Button type="button" size="sm" variant={mode === "code" ? "primary" : "outline"} aria-pressed={mode === "code"} onClick={() => { setHtml(formatEditorHtml(editor?.getHTML() ?? "")); setMode("code"); }}>Code</Button>
          {mode === "view" && <>
            <Button type="button" size="sm" variant="outline" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Insert table</Button>
            {editor?.isActive("table") && <>
              <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().addRowAfter().run()}>Add row</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().addColumnAfter().run()}>Add column</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().deleteRow().run()}>Delete row</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().deleteColumn().run()}>Delete column</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().deleteTable().run()}>Delete table</Button>
            </>}
          </>}
        </div>
        <div hidden={mode !== "view"}><EditorContent editor={editor} /></div>
        {mode === "code" && <HtmlCodeEditor id={id + "-html"} label={label} value={html} onChange={(value) => { setHtml(value); editor?.commands.setContent(value); }} />}


        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span>
            {uploading
              ? "Uploading image…"
              : `${words} ${words === 1 ? "word" : "words"}`}
          </span>
          <span>{characters} characters</span>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}

      <MediaPicker
        key={pickingKind}
        kind={pickingKind}
        open={picking}
        onOpenChange={setPicking}
        onSelect={(item) => {
          if (item.kind === "video") editor?.chain().focus().insertContent({ type: "video", attrs: { src: item.url, title: item.filename, caption: item.caption } }).run();
          else insertImage(item.url, item.altText ?? "", undefined, { caption: item.caption, description: item.description });
        }}
      />
    </div>
  );
}

function Separator() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />;
}

function ToolbarButton({
  editor,
  label,
  shortcut,
  active = false,
  onClick,
  children,
}: {
  editor: Editor | null;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={!editor}
      // Without this the button takes focus on mousedown, which blurs the
      // editor and collapses the selection: pressing Bold with words selected
      // would unselect them, and typing straight after pressing it would go to
      // the button and be lost. Preventing the default keeps the caret exactly
      // where the editor left it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`size-8 px-0 ${
        active
          ? "bg-primary/10 text-primary hover:bg-primary/15"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}
