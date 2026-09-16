"use client";

import { Save } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { saveDestinationAction } from "@/app/admin/(dashboard)/destinations/actions";
import { FaqEditor } from "@/components/cms/faq-editor";
import { ContentManagementPanel, FormSection, FormSections } from "@/components/cms/form-sections";
import { GalleryField } from "@/components/cms/gallery-field";
import { ImageField } from "@/components/cms/image-field";
import { MediaLibraryPanel } from "@/components/cms/media-drawer";
import { RepeatableField } from "@/components/cms/repeatable-field";
import { RichTextField } from "@/components/cms/rich-text-field";
import { SeoFields } from "@/components/cms/seo-fields";
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
import { MONTHS } from "@/schemas/destination";
import { slugify } from "@/schemas/common";
import type { Destination } from "@/types/content";

/**
 * The collapsible sections, in the order they appear.
 *
 * Module level so the array keeps its identity between renders: the jump list
 * feeds it to an IntersectionObserver effect.
 */
const SECTIONS = [
  { id: "section-description", label: "Description" },
  { id: "section-facts", label: "Facts" },
  { id: "section-highlights", label: "Highlights" },
  { id: "section-photographs", label: "Photographs" },
  { id: "section-faqs", label: "FAQs" },
  { id: "section-seo", label: "SEO" },
];

const CONTENT_TABS = [
  { id: "facts", label: "Facts", sectionIds: ["section-facts"] },
  { id: "overview", label: "Overview", sectionIds: ["section-description"] },
  { id: "highlights", label: "Highlights", sectionIds: ["section-highlights"] },
  { id: "info", label: "Info", sectionIds: ["section-photographs"] },
  { id: "faqs", label: "FAQs", sectionIds: ["section-faqs"] },
];

export interface DestinationFormProps {
  destination: Destination | null;
  /** Countries already in use, offered as suggestions. */
  countryOptions: string[];
  siteUrl: string;
  /** Where the frontend mounts destinations. For the slug hint only. */
  basePath?: string;
  canPublish: boolean;
}

/**
 * The destination editor.
 *
 * Longer than the post editor because a destination carries the facts a
 * traveller asks about — where it is, when to go, how long people stay — and
 * those belong in structured fields rather than buried in prose, so the
 * frontend can render them as a spec table and a map.
 */
export function DestinationForm({
  destination,
  countryOptions,
  siteUrl,
  basePath = "/destinations",
  canPublish,
}: DestinationFormProps) {
  const [state, formAction, pending] = useActionState(
    saveDestinationAction,
    IDLE,
  );

  const [name, setName] = useState(destination?.name ?? "");
  // null means "follow the name"; a string means the editor typed their own.
  const [slugOverride, setSlugOverride] = useState<string | null>(
    destination?.slug ?? null,
  );
  const slug = slugOverride ?? (name ? slugify(name) : "");
  const [shortDescription, setShortDescription] = useState(
    destination?.shortDescription ?? "",
  );
  // Mirrored out of the editors so the SEO panel grades what is on
  // screen rather than what was last saved.
  const [seoContent, setSeoContent] = useState(destination?.description ?? "");
  const [seoImage, setSeoImage] = useState(destination?.featuredImage ?? "");

  const [status, setStatus] = useState(destination?.status ?? "draft");

  const errors = state.fieldErrors ?? {};

  // On a failed save React resets the form to its defaults, so the defaults
  // have to become whatever was just submitted.
  const season = new Set(
    destination?.bestSeason ?? [],
  );




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
      {destination ? (
        <input type="hidden" name="id" value={destination.id} />
      ) : null}

      <FormSections
        sections={SECTIONS}
        tabs={CONTENT_TABS}
        // A rejected save opens everything: a collapsed section hides its own
        // errors, and "fix the highlighted fields" with nothing visibly
        // highlighted leaves the editor stuck.
        revealAll={!state.ok && Boolean(state.fieldErrors)}
      >
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card>
            <CardBody className="space-y-5">
              <Field id="name" label="Name" error={errors.name?.[0]} required>
                {(props) => (
                  <Input
                    {...props}
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Everest Base Camp"
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
                    placeholder="everest-base-camp"
                    className="font-mono text-xs"
                    required
                  />
                )}
              </Field>

              <Field
                id="shortDescription"
                label="Short description"
                error={errors.shortDescription?.[0]}
                hint="One or two lines for cards and listings."
              >
                {(props) => (
                  <Textarea
                    {...props}
                    name="shortDescription"
                    value={shortDescription}
                    onChange={(event) => setShortDescription(event.target.value)}
                    rows={2}
                  />
                )}
              </Field>
            </CardBody>
          </Card>

          <ContentManagementPanel>

          <FormSection id="section-description" title="Destination overview">
              <RichTextField
                id="description"
                name="description"
                label="Destination description"
                hideLabel
                defaultValue={destination?.description ?? ""}
                error={errors.description?.[0]}
                onValueChange={setSeoContent}
              />
          </FormSection>

          <FormSection
            id="section-facts"
            title="Facts"
            description="What a traveller asks before anything else."
            bodyClassName="space-y-5"
          >
              <div className="grid gap-4 sm:grid-cols-2">
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
                        defaultValue={destination?.country ?? ""}
                        list="destination-countries"
                        placeholder="Nepal"
                      />
                      <datalist id="destination-countries">
                        {countryOptions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    </>
                  )}
                </Field>

                <Field
                  id="region"
                  label="Region"
                  error={errors.region?.[0]}
                  hint="Province, district or massif."
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="region"
                      defaultValue={destination?.region ?? ""}
                      placeholder="Khumbu"
                    />
                  )}
                </Field>

                <Field
                  id="latitude"
                  label="Latitude"
                  error={errors.latitude?.[0]}
                  hint="Decimal degrees. Leave both blank for no map pin."
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="latitude"
                      defaultValue={destination?.latitude ?? ""}
                      placeholder="27.9881"
                      inputMode="decimal"
                    />
                  )}
                </Field>

                <Field
                  id="longitude"
                  label="Longitude"
                  error={errors.longitude?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="longitude"
                      defaultValue={destination?.longitude ?? ""}
                      placeholder="86.9250"
                      inputMode="decimal"
                    />
                  )}
                </Field>
              </div>

              <Field
                id="typicalDuration"
                label="Typical duration"
                error={errors.typicalDuration?.[0]}
                hint="Free text. Individual tour packages carry exact durations."
              >
                {(props) => (
                  <Input
                    {...props}
                    name="typicalDuration"
                    defaultValue={destination?.typicalDuration ?? ""}
                    placeholder="12–14 days"
                  />
                )}
              </Field>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  Best season
                </legend>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
                  {MONTHS.map((month) => (
                    <CheckboxField
                      key={month}
                      id={`bestSeason-${month}`}
                      name="bestSeason"
                      value={month}
                      label={month}
                      defaultChecked={season.has(month)}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Months you would send someone. Leave empty for year-round.
                </p>
              </fieldset>

          </FormSection>

          <FormSection id="section-highlights" title="Destination highlights">
            <RepeatableField
              name="highlights"
              label="Highlights"
              placeholder="Sunrise over Ama Dablam from Tengboche"
              addLabel="Add highlight"
              hint="The bullet points a listing page shows."
              defaultValue={destination?.highlights ?? []}
            />
          </FormSection>

          <FormSection
            id="section-photographs"
            title="Photographs"
            bodyClassName="space-y-5"
          >
              <ImageField
                id="featuredImage"
                name="featuredImage"
                label="Featured image"
                hint="Pick from the media library, or paste a URL from anywhere."
                defaultValue={destination?.featuredImage ?? ""}
                placeholder="/uploads/everest.jpg"
                onValueChange={setSeoImage}
              />

              <GalleryField
                name="gallery"
                hint="Shown in the order below. Use the arrows to reorder."
                defaultValue={destination?.gallery ?? []}
              />
          </FormSection>

          <FormSection id="section-faqs" title="Destination FAQs">
            <FaqEditor defaultValue={destination?.faqs ?? []} />
          </FormSection>

          </ContentManagementPanel>

          <SeoFields
            id="section-seo"
            seo={destination?.seo ?? null}
            fallbackTitle={name}
            fallbackDescription={shortDescription}
            slug={`${basePath}/${slug}`}
            siteUrl={siteUrl}
            errors={errors}
            content={seoContent}
            featuredImage={seoImage || null}
          />
        </div>

        {/*
          The rail sticks as one unit so the Fast menu stays reachable after a
          jump. Sticking only the menu was tried and was wrong: its siblings
          scrolled up underneath it and swallowed the Publishing heading.

          `self-start` is load bearing — a grid item stretches to the row height
          by default, which leaves sticky nothing to stick to. The rail can
          outgrow the viewport, so it scrolls itself, and `overscroll-contain`
          stops that scroll chaining into the page.
        */}
        <div className="cms-scroll space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
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
                      setStatus(event.target.value as Destination["status"])
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
                        destination?.publishedAt ?? null,
                      )}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={destination?.publishedAt ?? ""}
                />
              )}

              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending
                  ? "Saving…"
                  : destination
                    ? "Save changes"
                    : "Create destination"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <CheckboxField
                id="featured"
                name="featured"
                label="Feature this destination"
                hint="Marks it for the homepage set, read with cms.destinations.getFeatured()."
                defaultChecked={destination?.featured ?? false}
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
                    defaultValue={destination?.order ?? 0}
                  />
                )}
              </Field>

              <div className="space-y-1.5">
                <Label>Used by</Label>
                <p className="text-xs text-muted-foreground">
                  Tour packages and activities will reference this destination
                  once those modules land.
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
