"use client";

import { Save } from "lucide-react";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";

import { saveTourAction } from "@/app/admin/(dashboard)/tours/actions";
import { FaqEditor } from "@/components/cms/faq-editor";
import { GroupPricingEditor } from "@/components/cms/group-pricing-editor";
import { ContentManagementPanel, FormSection, FormSections } from "@/components/cms/form-sections";
import { GalleryField } from "@/components/cms/gallery-field";
import { ImageField } from "@/components/cms/image-field";
import { ItineraryEditor } from "@/components/cms/itinerary-editor";
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
  Select,
  Textarea,
} from "@/components/ui/field";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { IDLE } from "@/lib/actions/result";
import { slugify } from "@/schemas/common";
import { MONTHS } from "@/schemas/destination";
import { toDateTimeLocal } from "@/lib/utils";
import { TOUR_DIFFICULTIES, type TourPackage } from "@/types/content";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
  strenuous: "Strenuous",
  extreme: "Extreme",
};

/**
 * The collapsible sections, in the order they appear.
 *
 * Module level rather than inline so the array keeps the same identity between
 * renders: the jump list feeds it to an IntersectionObserver effect, and a new
 * array each render would rebuild the observer on every keystroke.
 */
const SECTIONS = [
  { id: "section-description", label: "Description" },
  { id: "section-pricing", label: "Pricing" },
  { id: "section-trip", label: "The trip" },
  { id: "section-itinerary", label: "Itinerary" },
  { id: "section-highlights", label: "Trip highlights" },
  { id: "section-inclusions", label: "Inclusions" },
  { id: "section-faqs", label: "FAQs" },
  { id: "section-photographs", label: "Photographs" },
  { id: "section-seo", label: "SEO" },
];

const CONTENT_TABS = [
  { id: "facts", label: "Facts", sectionIds: ["section-pricing", "section-trip"] },
  { id: "overview", label: "Overview", sectionIds: ["section-description", "section-itinerary"] },
  { id: "highlights", label: "Highlights", sectionIds: ["section-highlights", "section-inclusions"] },
  { id: "info", label: "Info", sectionIds: ["section-photographs"] },
  { id: "faqs", label: "FAQs", sectionIds: ["section-faqs"] },
];

export interface TourFormProps {
  tour: TourPackage | null;
  /** Destinations this tour can belong to. */
  destinationOptions: { id: string; name: string }[];
  /** Activities this tour can be tagged with. */
  activityOptions: { id: string; name: string }[];
  siteUrl: string;
  /** Where the frontend mounts tours. For the slug hint only. */
  basePath?: string;
  canPublish: boolean;
}

/**
 * The tour package editor.
 *
 * The longest form in the admin, and deliberately so: everything a customer
 * compares before booking — price, length, difficulty, what is included, the
 * day-by-day plan — is a field rather than a paragraph, so the frontend can
 * render a spec table and filter a listing on it.
 */
export function TourForm({
  tour,
  destinationOptions,
  activityOptions,
  siteUrl,
  basePath = "/tours",
  canPublish,
}: TourFormProps) {
  const [state, formAction, pending] = useActionState(saveTourAction, IDLE);

  const [name, setName] = useState(tour?.name ?? "");
  // null means "follow the name"; a string means the editor typed their own.
  const [slugOverride, setSlugOverride] = useState<string | null>(
    tour?.slug ?? null,
  );
  const slug = slugOverride ?? (name ? slugify(name) : "");
  const [shortDescription, setShortDescription] = useState(
    tour?.shortDescription ?? "",
  );
  // Mirrored out of the editors so the SEO panel grades what is on
  // screen rather than what was last saved.
  // Controlled so the group rate table can label its prices as you type.
  const [currency, setCurrency] = useState(tour?.currency ?? "USD");

  const [seoContent, setSeoContent] = useState(tour?.description ?? "");
  const [seoImage, setSeoImage] = useState(tour?.featuredImage ?? "");

  const [status, setStatus] = useState(tour?.status ?? "draft");

  const errors = state.fieldErrors ?? {};
  const season = new Set(tour?.bestSeason ?? []);

  const taggedActivities = new Set(tour?.activityIds ?? []);
  const listedActivities = new Set(activityOptions.map((option) => option.id));
  const unlistedActivityIds = (tour?.activityIds ?? []).filter(
    (id) => !listedActivities.has(id),
  );

  /**
   * Submitting by hand rather than through `<form action=…>`: React resets
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
      {tour ? <input type="hidden" name="id" value={tour.id} /> : null}

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
                    placeholder="Everest Base Camp Trek"
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
                    placeholder="everest-base-camp-trek"
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

          <FormSection id="section-description" title="Trip overview">
              <RichTextField
                id="description"
                name="description"
                label="Tour description"
                hideLabel
                defaultValue={tour?.description ?? ""}
                error={errors.description?.[0]}
                onValueChange={setSeoContent}
              />
          </FormSection>

          <FormSection
            id="section-pricing"
            title="Pricing"
            description="Display prices. This CMS never processes a payment."
            bodyClassName="space-y-4"
          >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="price" label="Price" error={errors.price?.[0]}>
                  {(props) => (
                    <Input
                      {...props}
                      name="price"
                      defaultValue={tour?.price ?? ""}
                      inputMode="decimal"
                      placeholder="1450"
                    />
                  )}
                </Field>

                <Field
                  id="compareAtPrice"
                  label="Compare at"
                  error={errors.compareAtPrice?.[0]}
                  hint="Optional. Shown struck through."
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="compareAtPrice"
                      defaultValue={tour?.compareAtPrice ?? ""}
                      inputMode="decimal"
                      placeholder="1650"
                    />
                  )}
                </Field>

                <Field
                  id="currency"
                  label="Currency"
                  error={errors.currency?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="currency"
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      placeholder="USD"
                      maxLength={3}
                      className="uppercase"
                    />
                  )}
                </Field>
              </div>

              <Field
                id="priceNote"
                label="Price note"
                error={errors.priceNote?.[0]}
                hint="The small print beside the number."
              >
                {(props) => (
                  <Input
                    {...props}
                    name="priceNote"
                    defaultValue={tour?.priceNote ?? ""}
                    placeholder="per person, twin share, excluding international flights"
                  />
                )}
              </Field>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium">Group rates</p>
                <p className="mt-1 mb-3 text-xs text-muted-foreground">
                  Per-person prices that fall as the party grows. Bands may not
                  overlap; leave a gap and those party sizes pay the price
                  above. Leave this empty for one price for everyone.
                </p>

                <GroupPricingEditor
                  name="groupPricing"
                  defaultValue={tour?.groupPricing ?? []}
                  currency={currency.toUpperCase() || "USD"}
                  errors={errors}
                />
              </div>
          </FormSection>

          <FormSection
            id="section-trip"
            title="The trip"
            description="What a customer compares before booking."
            bodyClassName="space-y-5"
          >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="durationDays"
                  label="Days"
                  error={errors.durationDays?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="durationDays"
                      defaultValue={tour?.durationDays ?? ""}
                      inputMode="numeric"
                      placeholder="14"
                    />
                  )}
                </Field>

                <Field
                  id="durationNights"
                  label="Nights"
                  error={errors.durationNights?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="durationNights"
                      defaultValue={tour?.durationNights ?? ""}
                      inputMode="numeric"
                      placeholder="13"
                    />
                  )}
                </Field>

                <Field
                  id="difficulty"
                  label="Difficulty"
                  error={errors.difficulty?.[0]}
                >
                  {(props) => (
                    <Select
                      {...props}
                      name="difficulty"
                      defaultValue={tour?.difficulty ?? ""}
                    >
                      <option value="">Not specified</option>
                      {TOUR_DIFFICULTIES.map((level) => (
                        <option key={level} value={level}>
                          {DIFFICULTY_LABELS[level]}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <Field
                  id="maxAltitude"
                  label="Maximum altitude (m)"
                  error={errors.maxAltitude?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="maxAltitude"
                      defaultValue={tour?.maxAltitude ?? ""}
                      inputMode="numeric"
                      placeholder="5364"
                    />
                  )}
                </Field>

                <Field
                  id="groupSizeMin"
                  label="Group size, minimum"
                  error={errors.groupSizeMin?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="groupSizeMin"
                      defaultValue={tour?.groupSizeMin ?? ""}
                      inputMode="numeric"
                      placeholder="2"
                    />
                  )}
                </Field>

                <Field
                  id="groupSizeMax"
                  label="Group size, maximum"
                  error={errors.groupSizeMax?.[0]}
                >
                  {(props) => (
                    <Input
                      {...props}
                      name="groupSizeMax"
                      defaultValue={tour?.groupSizeMax ?? ""}
                      inputMode="numeric"
                      placeholder="12"
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

          <FormSection
            id="section-itinerary"
            title="Itinerary"
            description="Day by day. Reorder with the arrows; days are renumbered when you save."
          >
              <ItineraryEditor
                name="itinerary"
                defaultValue={tour?.itinerary ?? []}
                errors={errors}
              />
          </FormSection>

          <FormSection id="section-highlights" title="Trip highlights">
            <RepeatableField
              name="highlights"
              label="Highlights"
              placeholder="Kala Patthar at sunrise"
              addLabel="Add highlight"
              defaultValue={tour?.highlights ?? []}
            />
          </FormSection>

          <FormSection
            id="section-inclusions"
            title="What is and is not included"
            description="The two lists that prevent most pre-booking emails."
            bodyClassName="grid gap-6 sm:grid-cols-2"
          >
              <RepeatableField
                name="inclusions"
                label="Included"
                placeholder="All meals during the trek"
                addLabel="Add inclusion"
                defaultValue={tour?.inclusions ?? []}
              />

              <RepeatableField
                name="exclusions"
                label="Not included"
                placeholder="International flights"
                addLabel="Add exclusion"
                defaultValue={tour?.exclusions ?? []}
              />
          </FormSection>

          <FormSection
            id="section-faqs"
            title="Frequently asked questions"
          >
              <FaqEditor defaultValue={tour?.faqs ?? []} />
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
                defaultValue={tour?.featuredImage ?? ""}
                placeholder="/uploads/ebc-trek.jpg"
                onValueChange={setSeoImage}
              />

              <GalleryField
                name="gallery"
                hint="Shown in the order below. Use the arrows to reorder."
                defaultValue={tour?.gallery ?? []}
              />
          </FormSection>

          </ContentManagementPanel>

          <SeoFields
            id="section-seo"
            seo={tour?.seo ?? null}
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
                      setStatus(event.target.value as TourPackage["status"])
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
                      defaultValue={toDateTimeLocal(tour?.publishedAt ?? null)}
                    />
                  )}
                </Field>
              ) : (
                <input
                  type="hidden"
                  name="publishedAt"
                  value={tour?.publishedAt ?? ""}
                />
              )}

              <Button type="submit" disabled={pending} className="w-full">
                <Save className="size-4" />
                {pending ? "Saving…" : tour ? "Save changes" : "Create tour"}
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <Field
                id="destinationId"
                label="Destination"
                error={errors.destinationId?.[0]}
                hint="Where this tour goes. Used to list tours on a destination page."
              >
                {(props) => (
                  <Select
                    {...props}
                    name="destinationId"
                    defaultValue={tour?.destinationId ?? ""}
                  >
                    <option value="">No destination</option>
                    {destinationOptions.map((option) => (
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
                label="Feature this tour"
                hint="Marks it for the homepage set, read with cms.tours.getFeatured()."
                defaultChecked={tour?.featured ?? false}
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
                    defaultValue={tour?.order ?? 0}
                  />
                )}
              </Field>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  Activities
                </legend>

                {activityOptions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No activities yet. Add some under Activities and they will
                    appear here.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {activityOptions.map((option) => (
                      <CheckboxField
                        key={option.id}
                        id={`activityIds-${option.id}`}
                        name="activityIds"
                        value={option.id}
                        label={option.name}
                        defaultChecked={taggedActivities.has(option.id)}
                      />
                    ))}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  What this tour involves. Used to cross-list it on activity
                  pages.
                </p>
              </fieldset>

              {/*
                Ids the picker cannot show — an activity moved to trash, or the
                whole module switched off for this client — are posted back
                verbatim. Without this, opening a tour would silently strip
                tags whose activity happened to be hidden at the time.
              */}
              {unlistedActivityIds.map((id) => (
                <input key={id} type="hidden" name="activityIds" value={id} />
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
      </FormSections>
    </form>
  );
}
