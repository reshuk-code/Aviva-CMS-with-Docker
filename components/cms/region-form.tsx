"use client";

import { Save } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { saveRegionAction } from "@/app/admin/(dashboard)/regions/actions";
import { FaqEditor } from "@/components/cms/faq-editor";
import { ContentManagementPanel, FormSection, FormSections } from "@/components/cms/form-sections";
import { FeaturedImagesField } from "@/components/cms/featured-images-field";
import { MediaLibraryPanel } from "@/components/cms/media-drawer";
import { RichTextField } from "@/components/cms/rich-text-field";
import { SeoFields } from "@/components/cms/seo-fields";
import { SeoJumpCard } from "@/components/cms/seo-jump-card";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  CheckboxField,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { IDLE } from "@/lib/actions/result";
import { richListContentToValue } from "@/lib/rich-text";
import { toDateTimeLocal } from "@/lib/utils";
import { slugify } from "@/schemas/common";
import { MONTHS } from "@/schemas/destination";
import type { Region } from "@/types/content";

/**
 * The collapsible sections, in the order they appear.
 *
 * Module level so the array keeps its identity between renders: the Fast menu
 * feeds it to an IntersectionObserver effect.
 */
const SECTIONS = [
  { id: "section-facts", label: "Facts" },
  { id: "section-description", label: "Overview" },
  { id: "section-highlights", label: "Highlights" },
  { id: "section-images", label: "Images" },
  { id: "section-faqs", label: "FAQs" },
  { id: "section-seo", label: "SEO" },
];

/** One tab per section. See the note in `tour-form.tsx`. */
const CONTENT_TABS = [
  { id: "facts", label: "Facts", sectionIds: ["section-facts"] },
  { id: "overview", label: "Overview", sectionIds: ["section-description"] },
  { id: "highlights", label: "Highlights", sectionIds: ["section-highlights"] },
  { id: "images", label: "Images", sectionIds: ["section-images"] },
  { id: "faqs", label: "FAQs", sectionIds: ["section-faqs"] },
];

export interface RegionFormProps {
  region: Region | null;
  /** Countries already in use, offered as suggestions. */
  countryOptions: string[];
  siteUrl: string;
  /** Where the frontend mounts regions. For the slug hint only. */
  basePath?: string;
  canPublish: boolean;
}

/**
 * The region editor.
 *
 * Deliberately the destination editor minus the things that only make sense
 * for a point on a map: no coordinates, because a region is an area and a pin
 * at its notional centre would be wrong more often than useful.
 */
export function RegionForm({
  region,
  countryOptions,
  siteUrl,
  basePath = "/regions",
  canPublish,
}: RegionFormProps) {
  const [state, formAction, pending] = useActionState(saveRegionAction, IDLE);

  const [name, setName] = useState(region?.name ?? "");
  // null means "follow the name"; a string means the editor typed their own.
  const [slugOverride, setSlugOverride] = useState<string | null>(
    region?.slug ?? null,
  );
  const slug = slugOverride ?? (name ? slugify(name) : "");
  const [shortDescription, setShortDescription] = useState(
    region?.shortDescription ?? "",
  );
  // Mirrored out of the editors so the SEO panel grades what is on
  // screen rather than what was last saved.
  const [seoContent, setSeoContent] = useState(region?.description ?? "");
  const [seoImage, setSeoImage] = useState(region?.featuredImage ?? "");

  const [status, setStatus] = useState(region?.status ?? "draft");

  const errors = state.fieldErrors ?? {};

  const season = new Set(region?.bestSeason ?? []);

  /**
   * Submitting by hand rather than through `<form action=...>`.
   *
   * React resets a form whose action prop is a function once that action
   * completes. On a validation failure that throws away everything the editor
   * typed: uncontrolled inputs fall back to their defaults, and controlled
   * ones are blanked in the DOM without React noticing.
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
      {region ? <input type="hidden" name="id" value={region.id} /> : null}

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
                    placeholder="Everest Region"
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
              >
                {(props) => (
                  <Input
                    {...props}
                    name="slug"
                    value={slug}
                    onChange={(event) => setSlugOverride(event.target.value)}
                    placeholder="everest-region"
                    className="font-mono text-xs"
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

          <FormSection id="section-facts" title="Facts" bodyClassName="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="country" label="Country" error={errors.country?.[0]}>
                {(props) => (
                  <>
                    <Input
                      {...props}
                      name="country"
                      defaultValue={region?.country ?? ""}
                      list="region-countries"
                      placeholder="Nepal"
                    />
                    <datalist id="region-countries">
                      {countryOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>

              <Field
                id="elevationRange"
                label="Elevation range"
                error={errors.elevationRange?.[0]}
              >
                {(props) => (
                  <Input
                    {...props}
                    name="elevationRange"
                    defaultValue={region?.elevationRange ?? ""}
                    placeholder="2,800–5,400 m"
                  />
                )}
              </Field>
            </div>

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
            </fieldset>
          </FormSection>

          <FormSection id="section-description" title="Overview">
            <RichTextField
              id="description"
              name="description"
              label="Overview"
              hideLabel
              defaultValue={region?.description ?? ""}
              error={errors.description?.[0]}
              onValueChange={setSeoContent}
            />
          </FormSection>

          <FormSection id="section-highlights" title="Highlights">
            <RichTextField
              id="highlights"
              name="highlights"
              label="Highlights"
              hideLabel
              defaultValue={richListContentToValue(region?.highlights)}
              error={errors.highlights?.[0]}
            />
          </FormSection>

          <FormSection id="section-images" title="Images">
            <FeaturedImagesField
              record={region}
              errors={errors}
              onFeaturedChange={setSeoImage}
            />
          </FormSection>

          <FormSection id="section-faqs" title="FAQs">
            <FaqEditor defaultValue={region?.faqs ?? []} />
          </FormSection>

          </ContentManagementPanel>

          <SeoFields
            id="section-seo"
            seo={region?.seo ?? null}
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
          jump. `self-start` is load bearing — a grid item stretches to the row
          height by default, which leaves sticky nothing to stick to.
        */}
        <div className="cms-scroll space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
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
                      setStatus(event.target.value as Region["status"])
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
                      defaultValue={toDateTimeLocal(region?.publishedAt ?? null)}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={region?.publishedAt ?? ""}
                />
              )}

              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending ? "Saving…" : region ? "Save changes" : "Create region"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <CheckboxField
                id="featured"
                name="featured"
                label="Feature this region"
                hint="Marks it for the homepage set, read with cms.regions.getFeatured()."
                defaultChecked={region?.featured ?? false}
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
                    defaultValue={region?.order ?? 0}
                  />
                )}
              </Field>
            </CardBody>
          </Card>
        </div>
      </div>
      </FormSections>
    </form>
  );
}
