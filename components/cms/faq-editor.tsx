"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import type { TourFaq } from "@/types/content";

/**
 * Question-and-answer rows.
 *
 * Flat, so it posts parallel inputs (`faqId`, `faqQuestion`, `faqAnswer`) and
 * the action zips them back together — the same shape as the page editor's
 * custom metadata. The itinerary needs JSON only because a day is nested.
 */
export function FaqEditor({
  defaultValue = [],
}: {
  defaultValue?: TourFaq[];
}) {
  const [faqs, setFaqs] = useState<TourFaq[]>(defaultValue);

  function patch(id: string, changes: Partial<TourFaq>) {
    setFaqs((current) =>
      current.map((faq) => (faq.id === id ? { ...faq, ...changes } : faq)),
    );
  }

  return (
    <div className="space-y-3">
      {faqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No questions yet. Add the ones the sales inbox keeps answering.
        </p>
      ) : null}

      {faqs.map((faq, index) => (
        <div
          key={faq.id}
          className="space-y-3 rounded-lg border border-border p-3"
        >
          <input type="hidden" name="faqId" value={faq.id} />

          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`faq-question-${faq.id}`}>
                Question {index + 1}
              </Label>
              <Input
                id={`faq-question-${faq.id}`}
                name="faqQuestion"
                value={faq.question}
                onChange={(event) =>
                  patch(faq.id, { question: event.target.value })
                }
                placeholder="Do I need previous trekking experience?"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-6"
              onClick={() =>
                setFaqs((current) => current.filter((item) => item.id !== faq.id))
              }
              aria-label={`Remove question ${index + 1}`}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`faq-answer-${faq.id}`}>Answer</Label>
            <Textarea
              id={`faq-answer-${faq.id}`}
              name="faqAnswer"
              value={faq.answer}
              onChange={(event) => patch(faq.id, { answer: event.target.value })}
              rows={2}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          setFaqs((current) => [
            ...current,
            { id: crypto.randomUUID(), question: "", answer: "" },
          ])
        }
      >
        <Plus className="size-4" />
        Add question
      </Button>
    </div>
  );
}
