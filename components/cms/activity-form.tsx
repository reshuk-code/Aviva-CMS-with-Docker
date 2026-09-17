"use client";
import { RichTextField } from "@/components/cms/rich-text-field";


import { Save } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { saveActivityAction } from "@/app/admin/(dashboard)/activities/actions";
import { FaqEditor } from "@/components/cms/faq-editor";
import { ContentManagementPanel, FormSection, FormSections } from "@/components/cms/form-sections";
import { FeaturedImagesField } from "@/components/cms/featured-images-field";
import { MediaLibraryPanel } from "@/components/cms/media-drawer";
import { SeoFields } from "@/components/cms/seo-fields";
import { SeoJumpCard } from "@/components/cms/seo-jump-card";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Label, Select } from "@/components/ui/field";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { IDLE } from "@/lib/actions/result";
import { toDateTimeLocal } from "@/lib/utils";
import { slugify } from "@/schemas/common";
import type { Activity } from "@/types/content";

/** One tab per section. See the note in `tour-form.tsx`. */
const CONTENT_TABS = [
  { id: "overview", label: "Overview", sectionIds: ["section-overview"] },
  { id: "info", label: "Info", sectionIds: ["section-presentation"] },
  { id: "images", label: "Images", sectionIds: ["section-images"] },
  { id: "faqs", label: "FAQs", sectionIds: ["section-faqs"] },
];

const SECTIONS = [
  { id: "section-overview", label: "Overview" },
  { id: "section-presentation", label: "Info" },
  { id: "section-images", label: "Images" },
  { id: "section-faqs", label: "FAQs" },
  { id: "section-seo", label: "SEO" },
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
  // Mirrored out of the Images tab so the SEO panel grades the picture that is
  // on screen rather than the one that was last saved.
  const [seoImage, setSeoImage] = useState(activity?.featuredImage ?? "");
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

      <FormSections sections={SECTIONS} tabs={CONTENT_TABS} revealAll={!state.ok && Boolean(state.fieldErrors)}>
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <ContentManagementPanel>

          <FormSection id="section-overview" title="Overview" bodyClassName="space-y-5">
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
                  <code className="rounded bg-muted px-1">
                    {siteUrl}
                    {basePath}/{slug || "…"}/
                  </code>
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

              <RichTextField
                id="description"
                name="description"
                label="Description"
                error={errors.description?.[0]}
                defaultValue={description}
                onValueChange={setDescription}
              />
          </FormSection>

          <FormSection id="section-presentation" title="Info" bodyClassName="space-y-5">
              <Field
                id="icon"
                label="Icon"
                error={errors.icon?.[0]}
                /* Not a file. Without this the field reads as an upload slot. */
                hint="A name your frontend maps to an icon."
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

          <FormSection id="section-images" title="Images">
            <FeaturedImagesField
              record={activity}
              errors={errors}
              onFeaturedChange={setSeoImage}
            />
          </FormSection>

          <FormSection id="section-faqs" title="FAQs">
            <FaqEditor defaultValue={activity?.faqs ?? []} />
          </FormSection>

          </ContentManagementPanel>

          <SeoFields
            id="section-seo"
            seo={activity?.seo ?? null}
            fallbackTitle={name}
            fallbackDescription={description}
            slug={`${basePath}/${slug}`}
            siteUrl={siteUrl}
            errors={errors}
            content={description}
            featuredImage={seoImage || null}
          />

        </div>

        <div className="space-y-5">
          <SeoJumpCard />

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
