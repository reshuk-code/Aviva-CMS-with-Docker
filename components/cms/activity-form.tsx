"use client";

import { Save } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { saveActivityAction } from "@/app/admin/(dashboard)/activities/actions";
import { FaqEditor } from "@/components/cms/faq-editor";
import { ContentManagementPanel, FormSection, FormSections } from "@/components/cms/form-sections";
import { ImageField } from "@/components/cms/image-field";
import { MediaLibraryPanel } from "@/components/cms/media-drawer";
import { SeoFields } from "@/components/cms/seo-fields";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/field";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { IDLE } from "@/lib/actions/result";
import { toDateTimeLocal } from "@/lib/utils";
import { slugify } from "@/schemas/common";
import type { Activity } from "@/types/content";

const CONTENT_TABS = [
  { id: "overview", label: "Overview", sectionIds: ["section-overview"] },
  { id: "info", label: "Info", sectionIds: ["section-presentation"] },
  { id: "faqs", label: "FAQs", sectionIds: ["section-faqs"] },
];

export interface ActivityFormProps {
  activity: Activity | null;
  /** Icon names already in use, offered as suggestions. */
  iconOptions: string[];
  /** How many tour packages reference this activity. Null on a new one. */
  usedByTours: number | null;
  siteUrl: string;
  /** Where the frontend mounts activities. For the slug hint only. */
  basePath?: string;
  canPublish: boolean;
}

/**
 * The activity editor.
 *
 * Much shorter than the destination editor, and that is the point: an activity
 * is a label with a landing page, so the form is a name, a picture and a
 * paragraph. Resisting the urge to add difficulty and season here keeps one
 * answer to each question — those belong to the tour that offers the activity.
 */
export function ActivityForm({
  activity,
  iconOptions,
  usedByTours,
  siteUrl,
  basePath = "/activities",
  canPublish,
}: ActivityFormProps) {
  const [state, formAction, pending] = useActionState(saveActivityAction, IDLE);

  const [name, setName] = useState(activity?.name ?? "");
  // null means "follow the name"; a string means the editor typed their own.
  const [slugOverride, setSlugOverride] = useState<string | null>(
    activity?.slug ?? null,
  );
  const slug = slugOverride ?? (name ? slugify(name) : "");
  const [description, setDescription] = useState(activity?.description ?? "");
  const [status, setStatus] = useState(activity?.status ?? "draft");

  const errors = state.fieldErrors ?? {};

  /**
   * Submitting by hand rather than through `<form action=...>`.
   *
   * React resets a form whose action prop is a function once that action
   * completes. On a validation failure that throws away everything the editor
   * typed: uncontrolled inputs fall back to their defaults, and controlled
   * ones are blanked in the DOM without React noticing, which can leave a
   * required field empty and silently block the next submit. Dispatching the
   * same action ourselves skips the reset and leaves the work on screen.
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
      {activity ? <input type="hidden" name="id" value={activity.id} /> : null}

      <FormSections sections={[]} tabs={CONTENT_TABS} revealAll={!state.ok && Boolean(state.fieldErrors)}>
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <ContentManagementPanel>

          <FormSection id="section-overview" title="Activity overview" bodyClassName="space-y-5">
              <Field id="name" label="Name" error={errors.name?.[0]} required>
                {(props) => (
                  <Input
                    {...props}
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Trekking"
                    className="text-base"
                    required
                  />
                )}
              </Field>

              <Field
                id="slug"
                label="Slug"
                error={errors.slug?.[0]}
                hint={
                  <>
                    Typically served at{" "}
                    <code className="rounded bg-muted px-1">
                      {siteUrl}
                      {basePath}/{slug || "…"}/
                    </code>{" "}
                    — the exact route is your frontend&apos;s to decide.
                  </>
                }
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    name="slug"
                    value={slug}
                    onChange={(event) => setSlugOverride(event.target.value)}
                    onBlur={(event) =>
                      setSlugOverride(
                        event.target.value ? slugify(event.target.value) : null,
                      )
                    }
                    placeholder="trekking"
                    className="font-mono text-xs"
                    required
                  />
                )}
              </Field>

              <Field
                id="description"
                label="Description"
                error={errors.description?.[0]}
                hint="A paragraph for the activity page and its cards."
              >
                {(props) => (
                  <Textarea
                    {...props}
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={6}
                    placeholder="Days on foot through the Khumbu, sleeping in teahouses…"
                  />
                )}
              </Field>
          </FormSection>

          <FormSection id="section-presentation" title="Activity info" bodyClassName="space-y-5">
              <ImageField
                id="featuredImage"
                name="featuredImage"
                label="Featured image"
                hint="Pick from the media library, or paste a URL from anywhere."
                defaultValue={activity?.featuredImage ?? ""}
                placeholder="/uploads/trekking.jpg"
                error={errors.featuredImage?.[0]}
              />

              <Field
                id="icon"
                label="Icon"
                error={errors.icon?.[0]}
                hint="A name your frontend maps to an icon, not a file — mountain-snow, waves, binoculars."
              >
                {(props) => (
                  <>
                    <Input
                      {...props}
                      name="icon"
                      defaultValue={activity?.icon ?? ""}
                      list="activity-icons"
                      placeholder="mountain-snow"
                      className="font-mono text-xs"
                    />
                    <datalist id="activity-icons">
                      {iconOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
          </FormSection>

          <FormSection id="section-faqs" title="Activity FAQs">
            <FaqEditor defaultValue={activity?.faqs ?? []} />
          </FormSection>

          </ContentManagementPanel>

          <SeoFields
            seo={activity?.seo ?? null}
            fallbackTitle={name}
            fallbackDescription={description}
            slug={`${basePath}/${slug}`}
            siteUrl={siteUrl}
            errors={errors}
          />
        </div>

        <div className="space-y-5">
          <MediaLibraryPanel />

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
                      setStatus(event.target.value as Activity["status"])
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
                        activity?.publishedAt ?? null,
                      )}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={activity?.publishedAt ?? ""}
                />
              )}

              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending
                  ? "Saving…"
                  : activity
                    ? "Save changes"
                    : "Create activity"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
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
                    defaultValue={activity?.order ?? 0}
                  />
                )}
              </Field>

              <div className="space-y-1.5">
                <Label>Used by</Label>
                <p className="text-xs text-muted-foreground">
                  {usedByTours === null
                    ? "Tour packages can tag themselves with this activity once it is saved."
                    : usedByTours === 0
                      ? "No tour packages use this activity yet."
                      : `${usedByTours} tour package${
                          usedByTours === 1 ? "" : "s"
                        } tagged with this activity.`}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
      </FormSections>
    </form>
  );
}
