"use client";

import { Save, Star } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { saveTestimonialAction } from "@/app/admin/(dashboard)/testimonials/actions";
import { ImageField } from "@/components/cms/image-field";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  CheckboxField,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/field";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { IDLE } from "@/lib/actions/result";
import { toDateTimeLocal } from "@/lib/utils";
import type { Testimonial } from "@/types/content";

export interface TestimonialFormProps {
  testimonial: Testimonial | null;
  /** Tours this review can be attached to. */
  tourOptions: { id: string; name: string }[];
  /** Countries already in use, offered as suggestions. */
  countryOptions: string[];
  canPublish: boolean;
}

const RATINGS = [5, 4, 3, 2, 1] as const;

/**
 * The testimonial editor.
 *
 * No slug and no SEO card: a review has no page of its own. What it does have
 * is attribution, and the form pushes for all of it — name, role, company,
 * country — because an unattributed quote is the one thing a reader discounts
 * entirely.
 */
export function TestimonialForm({
  testimonial,
  tourOptions,
  countryOptions,
  canPublish,
}: TestimonialFormProps) {
  const [state, formAction, pending] = useActionState(
    saveTestimonialAction,
    IDLE,
  );

  const [status, setStatus] = useState(testimonial?.status ?? "draft");
  const [rating, setRating] = useState(testimonial?.rating ?? 5);

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
      {testimonial ? (
        <input type="hidden" name="id" value={testimonial.id} />
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="The review"
              description="In the traveller's own words. Quote them; do not rewrite them."
            />
            <CardBody className="space-y-5">
              <Field
                id="message"
                label="Quote"
                error={errors.message?.[0]}
                required
              >
                {(props) => (
                  <Textarea
                    {...props}
                    name="message"
                    defaultValue={testimonial?.message ?? ""}
                    rows={7}
                    placeholder="The guiding was extraordinary — we never once felt rushed…"
                    required
                  />
                )}
              </Field>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  Rating
                </legend>
                <div className="flex items-center gap-3">
                  <Select
                    name="rating"
                    value={String(rating)}
                    onChange={(event) => setRating(Number(event.target.value))}
                    aria-label="Rating out of five"
                    className="w-32"
                  >
                    {RATINGS.map((value) => (
                      <option key={value} value={value}>
                        {value} star{value === 1 ? "" : "s"}
                      </option>
                    ))}
                  </Select>

                  <span className="flex items-center gap-0.5" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={
                          value <= rating
                            ? "size-4 fill-current text-amber-500"
                            : "size-4 text-muted-foreground/40"
                        }
                      />
                    ))}
                  </span>
                </div>
                {errors.rating?.[0] ? (
                  <p className="text-xs text-destructive">{errors.rating[0]}</p>
                ) : null}
              </fieldset>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Attribution"
              description="An unattributed quote is the one a reader discounts entirely."
            />
            <CardBody className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="name"
                  label="Name"
                  error={errors.name?.[0]}
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="name"
                      defaultValue={testimonial?.name ?? ""}
                      placeholder="Priya Raman"
                      required
                    />
                  )}
                </Field>

                <Field
                  id="position"
                  label="Role"
                  error={errors.position?.[0]}
                  hint="Optional. Shown after the name."
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="position"
                      defaultValue={testimonial?.position ?? ""}
                      placeholder="Head of Travel"
                    />
                  )}
                </Field>

                <Field
                  id="company"
                  label="Company"
                  error={errors.company?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="company"
                      defaultValue={testimonial?.company ?? ""}
                      placeholder="Meridian Group"
                    />
                  )}
                </Field>

                <Field
                  id="country"
                  label="Country"
                  error={errors.country?.[0]}
                >
                  {(props) => (
                    <>
                      <Input
                        {...props}
                        name="country"
                        defaultValue={testimonial?.country ?? ""}
                        list="testimonial-countries"
                        placeholder="Singapore"
                      />
                      <datalist id="testimonial-countries">
                        {countryOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </>
                  )}
                </Field>
              </div>

              <ImageField
                id="image"
                name="image"
                label="Photograph"
                hint="Optional. A face lifts a quote more than a logo does."
                defaultValue={testimonial?.image ?? ""}
                placeholder="/uploads/priya.jpg"
                error={errors.image?.[0]}
              />
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
                      setStatus(event.target.value as Testimonial["status"])
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
                      defaultValue={toDateTimeLocal(
                        testimonial?.publishedAt ?? null,
                      )}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={testimonial?.publishedAt ?? ""}
                />
              )}

              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending
                  ? "Saving…"
                  : testimonial
                    ? "Save changes"
                    : "Create testimonial"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                id="tourId"
                label="About which tour"
                error={errors.tourId?.[0]}
                hint="Optional. Lets the tour page show its own reviews."
              >
                {(props) => (
                  <Select
                    {...props}
                    name="tourId"
                    defaultValue={testimonial?.tourId ?? ""}
                  >
                    <option value="">Not tour-specific</option>
                    {tourOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <CheckboxField
                id="featured"
                name="featured"
                label="Feature this testimonial"
                hint="Marks it for the homepage set, read with cms.testimonials.getFeatured()."
                defaultChecked={testimonial?.featured ?? false}
              />

              <Field
                id="order"
                label="Order"
                error={errors.order?.[0]}
                hint="Lower numbers come first in listings."
              >
                {(props) => (
                  <Input
                    {...props}
                    name="order"
                    type="number"
                    defaultValue={testimonial?.order ?? 0}
                  />
                )}
              </Field>

              <div className="space-y-1.5">
                <Label>No page of its own</Label>
                <p className="text-xs text-muted-foreground">
                  Reviews are rendered inside other pages, so they carry no slug
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
