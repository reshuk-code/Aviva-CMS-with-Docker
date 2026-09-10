"use client";

import { AlertCircle, Save } from "lucide-react";
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import { saveTourAction } from "@/app/admin/(dashboard)/tours/actions";
import { FaqEditor } from "@/components/cms/faq-editor";
import { GalleryField } from "@/components/cms/gallery-field";
import { ImageField } from "@/components/cms/image-field";
import { ItineraryEditor } from "@/components/cms/itinerary-editor";
import { RepeatableField } from "@/components/cms/repeatable-field";
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

  useEffect(() => {
    if (state.ok && state.message) toast.success(state.message);
  }, [state]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {tour ? <input type="hidden" name="id" value={tour.id} /> : null}

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}

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
                      {basePath}/{slug || "…"}
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

          <Card>
            <CardHeader
              title="Description"
              description="Markdown-lite: # headings, - lists, **bold**, *italic*, [links](/url)."
            />
            <CardBody>
              <label htmlFor="description" className="sr-only">
                Tour description
              </label>
              <Textarea
                id="description"
                name="description"
                defaultValue={tour?.description ?? ""}
                rows={12}
                className="font-mono text-xs leading-relaxed"
                placeholder={
                  "## The route\n\nFrom Lukla the trail follows the Dudh Koshi…"
                }
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Pricing"
              description="Display prices. This CMS never processes a payment."
            />
            <CardBody className="space-y-4">
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
                      defaultValue={tour?.currency ?? "USD"}
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
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="The trip"
              description="What a customer compares before booking."
            />
            <CardBody className="space-y-5">
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

              <RepeatableField
                name="highlights"
                label="Highlights"
                placeholder="Kala Patthar at sunrise"
                addLabel="Add highlight"
                defaultValue={tour?.highlights ?? []}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Itinerary"
              description="Day by day. Reorder with the arrows; days are renumbered when you save."
            />
            <CardBody>
              <ItineraryEditor
                name="itinerary"
                defaultValue={tour?.itinerary ?? []}
                errors={errors}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="What is and is not included"
              description="The two lists that prevent most pre-booking emails."
            />
            <CardBody className="grid gap-6 sm:grid-cols-2">
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
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Frequently asked questions" />
            <CardBody>
              <FaqEditor defaultValue={tour?.faqs ?? []} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Photographs" />
            <CardBody className="space-y-5">
              <ImageField
                id="featuredImage"
                name="featuredImage"
                label="Featured image"
                hint="Pick from the media library, or paste a URL from anywhere."
                defaultValue={tour?.featuredImage ?? ""}
                placeholder="/uploads/ebc-trek.jpg"
              />

              <GalleryField
                name="gallery"
                hint="Shown in the order below. Use the arrows to reorder."
                defaultValue={tour?.gallery ?? []}
              />
            </CardBody>
          </Card>

          <SeoFields
            seo={tour?.seo ?? null}
            fallbackTitle={name}
            fallbackDescription={shortDescription}
            slug={`${basePath}/${slug}`}
            siteUrl={siteUrl}
            errors={errors}
          />
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
    </form>
  );
}
