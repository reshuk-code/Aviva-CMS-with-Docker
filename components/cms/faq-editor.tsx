"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { RichTextField } from "@/components/cms/rich-text-field";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { FAQ_DEFAULT_CATEGORIES } from "@/config/faq-categories";
import { cn } from "@/lib/utils";
import type { TourFaq } from "@/types/content";

const GENERAL = "__general";

/** Category list and question/answer table for an item's FAQs. */
export function FaqEditor({ defaultValue = [] }: { defaultValue?: TourFaq[] }) {
  const [faqs, setFaqs] = useState<TourFaq[]>(defaultValue);
  const [activeCategory, setActiveCategory] = useState(GENERAL);
  const [customCategories, setCustomCategories] = useState<string[]>(() => [
    ...new Set(
      defaultValue
        .map((faq) => faq.category?.trim())
        .filter((name): name is string => Boolean(name) && !FAQ_DEFAULT_CATEGORIES.some((item) => item === name)),
    ),
  ]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const categories = [GENERAL, ...FAQ_DEFAULT_CATEGORIES, ...customCategories];

  function patch(id: string, changes: Partial<TourFaq>) {
    setFaqs((current) =>
      current.map((faq) => (faq.id === id ? { ...faq, ...changes } : faq)),
    );
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    const existing = categories.find((category) => category.toLowerCase() === name.toLowerCase());
    if (!existing) setCustomCategories((current) => [...current, name]);
    setActiveCategory(existing ?? name);
    setNewCategory("");
    setAddingCategory(false);
  }

  function addRow() {
    setFaqs((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        question: "",
        answer: "",
        category: activeCategory === GENERAL ? null : activeCategory,
      },
    ]);
  }

  return (
    <div className="overflow-hidden rounded-md border border-border sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <div className="border-b border-border px-3 py-2.5 text-sm font-semibold text-foreground sm:col-span-2">
        FAQs Multiple Category
      </div>
      <nav aria-label="FAQ categories" className="border-b border-border bg-muted/20 sm:border-b-0 sm:border-r">
        <div className="max-h-80 overflow-y-auto sm:max-h-none">
          {categories.map((category) => {
            const selected = activeCategory === category;
            const label = category === GENERAL ? "General" : category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "block w-full border-b border-border px-3 py-2.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                  selected ? "bg-card font-semibold text-primary" : "text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="p-3">
          {addingCategory ? (
            <div className="space-y-2">
              <Label htmlFor="faq-new-category">Other category</Label>
              <Input
                id="faq-new-category"
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCategory();
                  }
                }}
                placeholder="Category name"
              />
              <div className="flex gap-1">
                <Button type="button" size="sm" onClick={addCategory}>Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setAddingCategory(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setAddingCategory(true)} className="w-full">
              <Plus className="size-4" /> Other category
            </Button>
          )}
        </div>
      </nav>

      <div className="min-w-0">
        <h4 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          {activeCategory === GENERAL ? "General" : activeCategory}
        </h4>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_2.5rem] border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
          <span className="px-3 py-2">Question</span>
          <span className="border-l border-border px-3 py-2">Answer</span>
          <span className="sr-only">Actions</span>
        </div>

        <div className="min-h-52">
          {faqs.map((faq, index) => {
            const selected = (faq.category || GENERAL) === activeCategory;
            if (!selected) {
              return (
                <div key={faq.id} hidden>
                  <input type="hidden" name="faqId" value={faq.id} />
                  <input type="hidden" name="faqQuestion" value={faq.question} />
                  <input type="hidden" name="faqAnswer" value={faq.answer} />
                  <input type="hidden" name="faqCategory" value={faq.category ?? ""} />
                </div>
              );
            }

            return (
              <div key={faq.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_2.5rem] border-b border-border last:border-b-0">
                <input type="hidden" name="faqId" value={faq.id} />
                <input type="hidden" name="faqCategory" value={faq.category ?? ""} />
                <div className="min-w-0 p-2.5">
                  <Label htmlFor={`faq-question-${faq.id}`} className="sr-only">Question {index + 1}</Label>
                  <Input
                    id={`faq-question-${faq.id}`}
                    name="faqQuestion"
                    value={faq.question}
                    onChange={(event) => patch(faq.id, { question: event.target.value })}
                    placeholder="Question"
                  />
                </div>
                <div className="min-w-0 border-l border-border p-2.5">
                  <RichTextField
                    id={`faq-answer-${faq.id}`}
                    name="faqAnswer"
                    label={`Answer ${index + 1}`}
                    hideLabel
                    defaultValue={faq.answer}
                    onValueChange={(answer) => patch(faq.id, { answer })}
                    placeholder="Answer the question…"
                  />
                </div>
                <div className="border-l border-border p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFaqs((current) => current.filter((item) => item.id !== faq.id))}
                    aria-label={`Remove question ${index + 1}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end border-t border-border p-3">
          <Button type="button" size="sm" onClick={addRow}>Add Row</Button>
        </div>
      </div>
    </div>
  );
}
