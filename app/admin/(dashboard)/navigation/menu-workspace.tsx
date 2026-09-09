"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { deleteMenuAction } from "@/app/admin/(dashboard)/navigation/actions";
import { MenuEditor } from "@/components/cms/menu-editor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Menu } from "@/types/navigation";

/**
 * Menu picker plus editor.
 *
 * Client-side selection because switching between two menus should not need a
 * round trip; every mutation still goes through a server action.
 */
export function MenuWorkspace({
  menus,
  selectedKey,
  pageOptions,
  canEdit,
  canCreate,
  canDelete,
}: {
  menus: Menu[];
  selectedKey?: string;
  pageOptions: { id: string; title: string; slug: string }[];
  canEdit: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();

  const initial =
    menus.find((menu) => menu.key === selectedKey)?.id ?? menus[0]?.id ?? null;

  const [activeId, setActiveId] = useState<string | null>(initial);
  const [creating, setCreating] = useState(menus.length === 0 && canCreate);

  const active = menus.find((menu) => menu.id === activeId) ?? null;

  async function remove(menu: Menu) {
    const result = await deleteMenuAction(menu.id);
    if (result.ok) {
      toast.success(result.message ?? "Menu deleted.");
      setActiveId(null);
      router.refresh();
    } else {
      toast.error(result.message ?? "Could not delete that menu.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {menus.map((menu) => (
          <button
            key={menu.id}
            type="button"
            onClick={() => {
              setCreating(false);
              setActiveId(menu.id);
            }}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              !creating && activeId === menu.id
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            {menu.name}
            <span className="ml-1.5 font-mono text-xs text-muted-foreground">
              {menu.key}
            </span>
          </button>
        ))}

        {canCreate ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCreating(true);
              setActiveId(null);
            }}
          >
            <Plus className="size-4" />
            New menu
          </Button>
        ) : null}
      </div>

      {creating ? (
        <MenuEditor
          key="new"
          menu={null}
          pageOptions={pageOptions}
          canDelete={false}
        />
      ) : active && canEdit ? (
        <MenuEditor
          key={active.id}
          menu={active}
          pageOptions={pageOptions}
          canDelete={canDelete}
          onDeleted={() => remove(active)}
        />
      ) : active ? (
        // Read-only roles see the structure but not an editor they cannot use.
        <ReadOnlyMenu menu={active} />
      ) : (
        <p className="text-sm text-muted-foreground">
          Select a menu to edit, or create one.
        </p>
      )}
    </div>
  );
}

function ReadOnlyMenu({ menu }: { menu: Menu }) {
  const render = (items: Menu["items"], depth = 0) =>
    items.map((item) => (
      <li key={item.id} style={{ marginLeft: `${depth * 1.25}rem` }}>
        <span className={item.visible ? "" : "text-muted-foreground line-through"}>
          {item.label}
        </span>
        {item.children.length ? (
          <ul className="mt-1 space-y-1">{render(item.children, depth + 1)}</ul>
        ) : null}
      </li>
    ));

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <p className="mb-3 text-sm font-medium">{menu.name}</p>
      {menu.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">This menu is empty.</p>
      ) : (
        <ul className="space-y-1 text-sm">{render(menu.items)}</ul>
      )}
    </div>
  );
}
