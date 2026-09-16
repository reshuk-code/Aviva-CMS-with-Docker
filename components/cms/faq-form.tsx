"use client";

import { Save } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { saveFaqAction } from "@/app/admin/(dashboard)/faqs/actions";
import { FaqCategoryField } from "@/components/cms/faq-category-field";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { IDLE } from "@/lib/actions/result";
import { toDateTimeLocal } from "@/lib/utils";
import type { Faq } from "@/types/content";

export interface FaqFormProps {
  faq: Faq | null;
  /** Categories already in use, offered as suggestions. */
  categoryOptions: string[];
  canPublish: boolean;
}

/**
 * The FAQ editor.
 *
 * The smallest editor in the admin. The answer is plain text rather than a
 * block: an answer that needs a gallery is not an answer, it is a page, and
 * the CMS already has those.
 */
export function FaqForm({ faq, categoryOptions, canPublish }: FaqFormProps) {
  const [state, formAction, pending] = useActionState(saveFaqAction, IDLE);

  const [status, setStatus] = useState(faq?.status ?? "draft");
  const [category, setCategory] = useState<string | null>(faq?.category ?? null);

  const errors = state.fieldErrors ?? {};

  /**
   * Submitting by hand rather than through `<form action=...>`: React resets
   * such a form once the action completes, which throws away everything the
   * editor typed when a save is rejected. See docs/ARCHITECTURE.md.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const formRef = useRef<HTMLFormElement>(null);
  useFormFeedback(state, formRef);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {faq ? <input type="hidden" name="id" value={faq.id} /> : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-5">
              <Field
                id="question"
                label="Question"
                error={errors.question?.[0]}
                hint="Write it the way a customer would ask it, not the way you would file it."
                required
              >
                {(props) => (
                  <Textarea
                    {...props}
                    name="question"
                    defaultValue={faq?.question ?? ""}
                    rows={2}
                    placeholder="Do I need a visa for Nepal?"
                    required
                  />
                )}
              </Field>

              <Field
                id="answer"
                label="Answer"
                error={errors.answer?.[0]}
                required
              >
                {(props) => (
                  <Textarea
                    {...props}
                    name="answer"
                    defaultValue={faq?.answer ?? ""}
                    rows={10}
                    placeholder="Most nationalities can buy a visa on arrival at Kathmandu airport…"
                    required
                  />
                )}
              </Field>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="space-y-4">
              <Field id="status" label="Status" error={errors.status?.[0]}>
                {(props) => (
                  <Select
                    {...props}
                    name="status"
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as Faq["status"])
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="published" disabled={!canPublish}>
                      Published
                    </option>
                    <option value="scheduled" disabled={!canPublish}>
                      Scheduled
                    </option>
                    <option value="trash">Trash</option>
                  </Select>
                )}
              </Field>

              {!canPublish ? (
                <p className="text-xs text-muted-foreground">
                  Your role can save drafts but not publish them.
                </p>
              ) : null}

              {status === "scheduled" ? (
                <Field
                  id="publishedAt"
                  label="Publish at"
                  error={errors.publishedAt?.[0]}
                  hint="Goes live automatically once this time passes."
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="publishedAt"
                      type="datetime-local"
                      defaultValue={toDateTimeLocal(faq?.publishedAt ?? null)}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={faq?.publishedAt ?? ""}
                />
              )}

              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending ? "Saving…" : faq ? "Save changes" : "Create FAQ"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <FaqCategoryField
                id="category"
                name="category"
                value={category}
                onChange={setCategory}
                extraCategories={categoryOptions}
              />

              <Field
                id="order"
                label="Order"
                error={errors.order?.[0]}
                hint="Lower numbers come first within the category."
              >
                {(props) => (
                  <Input
                    {...props}
                    name="order"
                    type="number"
                    defaultValue={faq?.order ?? 0}
                  />
                )}
              </Field>

              <div className="space-y-1.5">
                <Label>No page of its own</Label>
                <p className="text-xs text-muted-foreground">
                  FAQs are rendered inside other pages, so they carry no slug
                  and no SEO fields.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </form>
  );
}
