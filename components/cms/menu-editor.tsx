"use client";

import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  IndentDecrease,
  IndentIncrease,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { saveMenuAction } from "@/app/admin/(dashboard)/navigation/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { IDLE } from "@/lib/actions/result";
import type { Menu, MenuItem } from "@/types/navigation";

interface PageOption {
  id: string;
  title: string;
  slug: string;
}

/**
 * Menu editor.
 *
 * Structure is edited as a flat list with indent controls rather than
 * drag-and-drop: it works with a keyboard, needs no drag library, and one
 * level of nesting is what a travel site's header actually uses. The list is
 * converted back to a tree on save.
 */
interface FlatItem extends Omit<MenuItem, "children"> {
  depth: number;
}

function flatten(items: MenuItem[], depth = 0): FlatItem[] {
  return items.flatMap((item) => [
    { ...item, depth, children: undefined as never },
    ...flatten(item.children, depth + 1),
  ]);
}

/** Rebuilds the tree from depths, clamping any impossible indentation. */
function nest(items: FlatItem[]): MenuItem[] {
  const roots: MenuItem[] = [];
  const stack: MenuItem[] = [];

  for (const flat of items) {
    const depth = Math.min(flat.depth, stack.length);
    const node: MenuItem = {
      id: flat.id,
      label: flat.label,
      target: flat.target,
      pageId: flat.pageId,
      entityType: flat.entityType,
      entityId: flat.entityId,
      url: flat.url,
      openInNewTab: flat.openInNewTab,
      visible: flat.visible,
      children: [],
    };

    stack.length = depth;
    if (depth === 0) roots.push(node);
    else stack[depth - 1].children.push(node);
    stack.push(node);
  }

  return roots;
}

export function MenuEditor({
  menu,
  pageOptions,
  canDelete,
  onDeleted,
}: {
  menu: Menu | null;
  pageOptions: PageOption[];
  canDelete: boolean;
  onDeleted?: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveMenuAction, IDLE);
  const [items, setItems] = useState<FlatItem[]>(
    menu ? flatten(menu.items) : [],
  );

  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  function update(index: number, patch: Partial<FlatItem>) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "New item",
        target: "page",
        pageId: pageOptions[0]?.id ?? null,
        entityType: null,
        entityId: null,
        url: null,
        openInNewTab: false,
        visible: true,
        depth: 0,
      },
    ]);
  }

  return (
    <form action={formAction} className="space-y-5">
      {menu ? <input type="hidden" name="id" value={menu.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(nest(items))} />

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field id="menu-name" label="Menu name" error={errors.name?.[0]} required>
            {(props) => (
              <Input
                {...props}
                name="name"
                defaultValue={menu?.name ?? ""}
                placeholder="Main menu"
                required
              />
            )}
          </Field>

          <Field
            id="menu-key"
            label="Menu key"
            error={errors.key?.[0]}
            hint={
              <>
                Used by the frontend:{" "}
                <code className="rounded bg-muted px-1">
                  cms.navigation.get(&quot;{menu?.key || "main"}&quot;)
                </code>
              </>
            }
            required
          >
            {(props) => (
              <Input
                {...props}
                name="key"
                defaultValue={menu?.key ?? ""}
                placeholder="main"
                className="font-mono text-xs"
                required
              />
            )}
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Menu items"
          description="Indent an item to make it a submenu of the item above."
          action={
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="size-4" />
              Add item
            </Button>
          }
        />

        <CardBody className="space-y-2">
          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              This menu is empty. Add your first item.
            </p>
          ) : null}

          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-md border border-border bg-muted/30 p-3"
              style={{ marginLeft: `${item.depth * 1.5}rem` }}
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-40 flex-1">
                  <label className="sr-only" htmlFor={`label-${item.id}`}>
                    Label
                  </label>
                  <Input
                    id={`label-${item.id}`}
                    value={item.label}
                    onChange={(event) => update(index, { label: event.target.value })}
                    placeholder="Label"
                  />
                </div>

                <div className="w-32">
                  <label className="sr-only" htmlFor={`target-${item.id}`}>
                    Link type
                  </label>
                  <Select
                    id={`target-${item.id}`}
                    value={item.target}
                    onChange={(event) =>
                      update(index, {
                        target: event.target.value as MenuItem["target"],
                      })
                    }
                  >
                    <option value="page">CMS page</option>
                    <option value="custom">Custom URL</option>
                    <option value="heading">Heading</option>
                  </Select>
                </div>

                <div className="min-w-44 flex-1">
                  {item.target === "page" ? (
                    <>
                      <label className="sr-only" htmlFor={`page-${item.id}`}>
                        Page
                      </label>
                      <Select
                        id={`page-${item.id}`}
                        value={item.pageId ?? ""}
                        onChange={(event) =>
                          update(index, { pageId: event.target.value || null })
                        }
                      >
                        <option value="">Choose a page…</option>
                        {pageOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.title} ({option.slug})
                          </option>
                        ))}
                      </Select>
                    </>
                  ) : item.target === "custom" ? (
                    <>
                      <label className="sr-only" htmlFor={`url-${item.id}`}>
                        URL
                      </label>
                      <Input
                        id={`url-${item.id}`}
                        value={item.url ?? ""}
                        onChange={(event) =>
                          update(index, { url: event.target.value || null })
                        }
                        placeholder="/contact or https://…"
                      />
                    </>
                  ) : (
                    <p className="py-2 text-xs text-muted-foreground">
                      A non-clickable label for grouping.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${item.label} up`}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    aria-label={`Move ${item.label} down`}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => update(index, { depth: Math.max(0, item.depth - 1) })}
                    disabled={item.depth === 0}
                    aria-label={`Outdent ${item.label}`}
                  >
                    <IndentDecrease className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => update(index, { depth: item.depth + 1 })}
                    disabled={index === 0}
                    aria-label={`Indent ${item.label}`}
                  >
                    <IndentIncrease className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => update(index, { visible: !item.visible })}
                    aria-label={
                      item.visible ? `Hide ${item.label}` : `Show ${item.label}`
                    }
                  >
                    {item.visible ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setItems((current) => current.filter((_, i) => i !== index))
                    }
                    aria-label={`Remove ${item.label}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {!item.visible ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Hidden — it will not be returned to the frontend.
                </p>
              ) : null}
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-2">
        <Button type="submit" disabled={pending}>
          <Save className="size-4" />
          {pending ? "Saving…" : menu ? "Save menu" : "Create menu"}
        </Button>

        {menu && canDelete && onDeleted ? (
          <Button type="button" variant="ghost" onClick={onDeleted}>
            <Trash2 className="size-4 text-destructive" />
            Delete menu
          </Button>
        ) : null}
      </div>
    </form>
  );
}
