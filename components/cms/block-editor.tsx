"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { GalleryField } from "@/components/cms/gallery-field";
import { ImageField } from "@/components/cms/image-field";
import { RichTextField } from "@/components/cms/rich-text-field";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  createBlockInstance,
  getBlock,
  listBlocks,
  type BlockField,
} from "@/lib/cms/blocks";
import type { BlockInstance } from "@/types/blocks";

/**
 * The page body editor.
 *
 * Blocks are added, reordered and removed from a list — explicitly *not* a
 * drag-and-drop canvas. That is out of scope by decision, not by omission: a
 * builder that competes with Elementor is the thing this project refuses to
 * become, and up/down buttons reorder reliably on touch screens and with a
 * keyboard, which drag handles do not.
 *
 * Posts one hidden field of JSON, like the itinerary editor, because a block's
 * props are an open-ended object and flattening that into form fields would
 * mean inventing a naming convention every reader would have to decode.
 *
 * The form for each block is generated from its registered `fields`, so a
 * project that registers its own block gets an editor without touching this
 * file.
 */
export function BlockEditor({
  name,
  defaultValue = [],
}: {
  name: string;
  defaultValue?: BlockInstance[];
}) {
  const [blocks, setBlocks] = useState<BlockInstance[]>(defaultValue);
  const [openId, setOpenId] = useState<string | null>(
    defaultValue[0]?.id ?? null,
  );

  const catalogue = listBlocks();

  function add(type: string) {
    const block = createBlockInstance(type);
    setBlocks((current) => [...current, block]);
    setOpenId(block.id);
  }

  function remove(id: string) {
    setBlocks((current) => current.filter((block) => block.id !== id));
  }

  function move(index: number, direction: -1 | 1) {
    setBlocks((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function patchProps(id: string, changes: Record<string, unknown>) {
    setBlocks((current) =>
      current.map((block) =>
        block.id === id
          ? { ...block, props: { ...block.props, ...changes } }
          : block,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(blocks)} />

      {blocks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          This page has no content yet. Add a block to begin.
        </p>
      ) : null}

      <ol className="space-y-3">
        {blocks.map((block, index) => {
          const definition = getBlock(block.type);
          const open = openId === block.id;

          return (
            <li
              key={block.id}
              className="overflow-hidden rounded-lg border border-border"
            >
              <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : block.id)}
                  className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                  aria-expanded={open}
                >
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  {definition?.label ?? block.type}
                  {!definition ? (
                    <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-normal text-destructive">
                      Unknown block
                    </span>
                  ) : null}
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="size-4" />
                  <span className="sr-only">Move up</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="size-4" />
                  <span className="sr-only">Move down</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(block.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                  <span className="sr-only">Remove block</span>
                </Button>
              </div>

              {open ? (
                <div className="space-y-4 border-t border-border p-4">
                  {definition ? (
                    definition.fields.map((field) => (
                      <BlockFieldControl
                        key={field.name}
                        blockId={block.id}
                        field={field}
                        value={block.props[field.name]}
                        onChange={(value) =>
                          patchProps(block.id, { [field.name]: value })
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No block named <code>{block.type}</code> is registered, so
                      there is nothing to edit. Its content is kept as-is and
                      skipped when the page renders — remove it, or register the
                      block in code.
                    </p>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus className="size-4" />
            Add block
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-50 max-h-80 w-72 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg"
          >
            {catalogue.map((definition) => (
              <DropdownMenu.Item
                key={definition.name}
                className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-muted"
                onSelect={() => add(definition.name)}
              >
                <span className="block text-sm font-medium">
                  {definition.label}
                </span>
                {definition.description ? (
                  <span className="block text-xs text-muted-foreground">
                    {definition.description}
                  </span>
                ) : null}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/** Renders one control from a block's registered field descriptor. */
function BlockFieldControl({
  blockId,
  field,
  value,
  onChange,
}: {
  blockId: string;
  field: BlockField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `${blockId}-${field.name}`;

  // ImageField and GalleryField own their state and post hidden inputs of their
  // own. Here they are used purely as controls, so their value is mirrored back
  // into the block through onChange and their hidden input is ignored — the
  // editor posts the whole body as one JSON field.
  if (field.kind === "image") {
    return (
      <ImageField
        id={id}
        name={`${id}-unused`}
        label={field.label}
        hint={field.hint}
        defaultValue={typeof value === "string" ? value : ""}
        placeholder={field.placeholder}
        onValueChange={onChange}
      />
    );
  }

  if (field.kind === "gallery") {
    return (
      <GalleryField
        name={`${id}-unused`}
        label={field.label}
        hint={field.hint}
        defaultValue={Array.isArray(value) ? (value as string[]) : []}
        onValueChange={onChange}
      />
    );
  }

  if (field.kind === "richtext") {
    return (
      <RichTextField
        id={id}
        name={`${id}-unused`}
        label={field.label}
        hint={field.hint}
        defaultValue={typeof value === "string" ? value : ""}
        onValueChange={onChange}
      />
    );
  }

  if (field.kind === "boolean") {
    return (
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-4 rounded border-input accent-[var(--primary)]"
        />
        <div className="space-y-0.5">
          <Label htmlFor={id} className="font-normal">
            {field.label}
          </Label>
          {field.hint ? (
            <p className="text-xs text-muted-foreground">{field.hint}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{field.label}</Label>

      {field.kind === "textarea" ? (
        <Textarea
          id={id}
          rows={field.name === "content" ? 12 : 3}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={field.name === "content" ? "font-mono text-xs" : undefined}
        />
      ) : field.kind === "select" ? (
        <Select
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      ) : (
        <Input
          id={id}
          type={field.kind === "number" ? "number" : "text"}
          value={
            typeof value === "string" || typeof value === "number"
              ? String(value)
              : ""
          }
          onChange={(event) =>
            onChange(
              field.kind === "number"
                ? Number(event.target.value)
                : event.target.value,
            )
          }
          placeholder={field.placeholder}
        />
      )}

      {field.hint ? (
        <p className="text-xs text-muted-foreground">{field.hint}</p>
      ) : null}
    </div>
  );
}
