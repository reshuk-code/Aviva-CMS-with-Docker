"use client";

import { FAQ_DEFAULT_CATEGORIES } from "@/config/faq-categories";
import { Input, Label, Select } from "@/components/ui/field";

const GENERAL = "__general";
const OTHER = "__other";

export function FaqCategoryField({
  id,
  name,
  value,
  onChange,
  extraCategories = [],
}: {
  id: string;
  name: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  extraCategories?: string[];
}) {
  const categories = [...new Set([...FAQ_DEFAULT_CATEGORIES, ...extraCategories.filter(Boolean)])];
  const selected = value == null ? GENERAL : categories.includes(value as typeof categories[number]) ? value : OTHER;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>FAQ category</Label>
      <Select
        id={id}
        value={selected}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next === GENERAL ? null : next === OTHER ? "" : next);
        }}
      >
        <option value={GENERAL}>General</option>
        {categories.map((category) => (
          <option key={category} value={category}>{category}</option>
        ))}
        <option value={OTHER}>Other — add a category</option>
      </Select>

      {selected === OTHER ? (
        <Input
          name={name}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder="New category heading"
          aria-label="New FAQ category"
          required
        />
      ) : (
        <input type="hidden" name={name} value={value ?? ""} />
      )}
    </div>
  );
}
