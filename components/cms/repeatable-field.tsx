"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

/**
 * A list of short text values — highlights, inclusions, what to pack.
 *
 * Every row posts under the same name, so the server reads the list with
 * `FormData.getAll()` and the schema trims the blanks. Rows are addressed by a
 * stable key rather than their index, so deleting the second of five does not
 * make React reuse the wrong input's DOM state.
 */
export function RepeatableField({
  name,
  label,
  hint,
  placeholder,
  defaultValue = [],
  addLabel = "Add row",
}: {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  defaultValue?: string[];
  addLabel?: string;
}) {
  const [rows, setRows] = useState(() =>
    defaultValue.map((value, index) => ({ key: `initial-${index}`, value })),
  );

  function update(key: string, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, value } : row)),
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing yet.</p>
      ) : null}

      {rows.map((row, index) => (
        <div key={row.key} className="flex items-center gap-2">
          <GripVertical
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <label className="sr-only" htmlFor={`${name}-${row.key}`}>
            {label} {index + 1}
          </label>
          <Input
            id={`${name}-${row.key}`}
            name={name}
            value={row.value}
            placeholder={placeholder}
            onChange={(event) => update(row.key, event.target.value)}
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() =>
              setRows((current) => current.filter((item) => item.key !== row.key))
            }
            aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setRows((current) => [
            ...current,
            { key: `row-${Date.now()}-${current.length}`, value: "" },
          ])
        }
      >
        <Plus className="size-4" />
        {addLabel}
      </Button>

      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
