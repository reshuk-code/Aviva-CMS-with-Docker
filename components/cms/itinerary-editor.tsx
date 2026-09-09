"use client";

import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";

import { MediaPicker } from "@/components/cms/media-picker";
import { MediaThumb } from "@/components/cms/media-thumb";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { MEALS } from "@/schemas/tour";
import type { ItineraryDay } from "@/types/content";

/**
 * Day-by-day itinerary editor.
 *
 * Posts one hidden field containing JSON rather than parallel inputs: a day
 * holds its own lists of meals, activities and images, and encoding nested
 * arrays into flat form fields would mean inventing a naming convention that
 * every reader would then have to decode.
 *
 * Day numbers are display-only. The repository renumbers 1..n on save, so
 * reordering days here cannot leave gaps or duplicates in the stored data.
 */
export function ItineraryEditor({
  name,
  defaultValue = [],
  errors = {},
}: {
  name: string;
  defaultValue?: ItineraryDay[];
  /**
   * The whole field-error map, not one message. A rejected day reports under
   * `itinerary.<index>.<field>`, and without somewhere to show that the editor
   * would see "please fix the highlighted fields" with nothing highlighted.
   */
  errors?: Record<string, string[]>;
}) {
  const [days, setDays] = useState<ItineraryDay[]>(defaultValue);
  const [openId, setOpenId] = useState<string | null>(
    defaultValue[0]?.id ?? null,
  );
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  /** Messages for one day, keyed by the index it was submitted at. */
  function dayErrors(index: number): string[] {
    return Object.entries(errors)
      .filter(([key]) => key.startsWith(`${name}.${index}.`))
      .flatMap(([, messages]) => messages);
  }

  function patch(id: string, changes: Partial<ItineraryDay>) {
    setDays((current) =>
      current.map((day) => (day.id === id ? { ...day, ...changes } : day)),
    );
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= days.length) return;

    setDays((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addDay() {
    const day: ItineraryDay = {
      id: crypto.randomUUID(),
      day: days.length + 1,
      title: "",
      description: "",
      accommodation: null,
      meals: [],
      activities: [],
      images: [],
      altitude: null,
      duration: null,
    };

    setDays((current) => [...current, day]);
    setOpenId(day.id);
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          days.map((day, index) => ({ ...day, day: index + 1 })),
        )}
      />

      {days.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No days yet. A tour can be published without an itinerary, but few
          customers book one.
        </p>
      ) : null}

      <ol className="space-y-2">
        {days.map((day, index) => {
          const open = openId === day.id;
          const problems = dayErrors(index);

          return (
            <li
              key={day.id}
              className={cn(
                "overflow-hidden rounded-lg border",
                problems.length ? "border-destructive" : "border-border",
              )}
            >
              <div className="flex items-center gap-2 bg-muted/40 px-3 py-2">
                <span className="shrink-0 rounded bg-card px-2 py-0.5 text-xs font-medium">
                  Day {index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : day.id)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium hover:text-primary"
                  aria-expanded={open}
                >
                  {day.title || <span className="text-muted-foreground">Untitled day</span>}
                </button>

                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label={`Move day ${index + 1} earlier`}
                >
                  <ChevronUp className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === days.length - 1}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label={`Move day ${index + 1} later`}
                >
                  <ChevronDown className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDays((current) => current.filter((d) => d.id !== day.id))
                  }
                  className="rounded p-1 text-destructive hover:opacity-80"
                  aria-label={`Remove day ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>

              {problems.length && !open ? (
                <p className="border-t border-border px-3 py-2 text-xs text-destructive">
                  {problems[0]}
                </p>
              ) : null}

              {open ? (
                <div className="space-y-4 p-3">
                  {problems.length ? (
                    <p className="text-xs text-destructive">{problems[0]}</p>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label htmlFor={`day-title-${day.id}`}>Title</Label>
                    <Input
                      id={`day-title-${day.id}`}
                      value={day.title}
                      onChange={(event) =>
                        patch(day.id, { title: event.target.value })
                      }
                      placeholder="Kathmandu to Lukla, trek to Phakding"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`day-description-${day.id}`}>
                      Description
                    </Label>
                    <Textarea
                      id={`day-description-${day.id}`}
                      value={day.description}
                      onChange={(event) =>
                        patch(day.id, { description: event.target.value })
                      }
                      rows={3}
                      placeholder="An early flight into the mountains, then a gentle three-hour walk downhill…"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`day-accommodation-${day.id}`}>
                        Accommodation
                      </Label>
                      <Input
                        id={`day-accommodation-${day.id}`}
                        value={day.accommodation ?? ""}
                        onChange={(event) =>
                          patch(day.id, {
                            accommodation: event.target.value || null,
                          })
                        }
                        placeholder="Teahouse"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`day-duration-${day.id}`}>
                        Walking time
                      </Label>
                      <Input
                        id={`day-duration-${day.id}`}
                        value={day.duration ?? ""}
                        onChange={(event) =>
                          patch(day.id, { duration: event.target.value || null })
                        }
                        placeholder="5–6 hrs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`day-altitude-${day.id}`}>
                        Altitude (m)
                      </Label>
                      <Input
                        id={`day-altitude-${day.id}`}
                        value={day.altitude ?? ""}
                        onChange={(event) => {
                          const raw = event.target.value.trim();
                          patch(day.id, {
                            altitude: raw === "" ? null : Number(raw),
                          });
                        }}
                        inputMode="numeric"
                        placeholder="2610"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`day-activities-${day.id}`}>
                        Activities
                      </Label>
                      <Input
                        id={`day-activities-${day.id}`}
                        value={day.activities.join(", ")}
                        onChange={(event) =>
                          patch(day.id, {
                            activities: event.target.value
                              .split(",")
                              .map((item) => item.trim())
                              .filter(Boolean),
                          })
                        }
                        placeholder="Sightseeing, short hike"
                      />
                    </div>
                  </div>

                  <fieldset className="space-y-1.5">
                    <legend className="text-sm font-medium">Meals included</legend>
                    <div className="flex flex-wrap gap-4">
                      {MEALS.map((meal) => (
                        <label
                          key={meal}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input accent-[var(--primary)]"
                            checked={day.meals.includes(meal)}
                            onChange={(event) =>
                              patch(day.id, {
                                meals: event.target.checked
                                  ? [...day.meals, meal]
                                  : day.meals.filter((item) => item !== meal),
                              })
                            }
                          />
                          {meal}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="space-y-2">
                    <Label>Photographs</Label>

                    {day.images.length > 0 ? (
                      <ul className="flex flex-wrap gap-2">
                        {day.images.map((url, imageIndex) => (
                          <li
                            key={`${url}-${imageIndex}`}
                            className="relative size-16 overflow-hidden rounded-md border border-border"
                          >
                            <MediaThumb url={url} kind="image" alt="" />
                            <button
                              type="button"
                              onClick={() =>
                                patch(day.id, {
                                  images: day.images.filter(
                                    (_, i) => i !== imageIndex,
                                  ),
                                })
                              }
                              className="absolute right-0 top-0 rounded-bl bg-card/90 p-0.5 text-destructive"
                              aria-label={`Remove image ${imageIndex + 1} from day ${index + 1}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPickingFor(day.id)}
                    >
                      <ImagePlus className="size-4" />
                      Add image
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {errors[name]?.[0] ? (
        <p className="text-xs text-destructive">{errors[name][0]}</p>
      ) : null}

      <Button type="button" variant="outline" size="sm" onClick={addDay}>
        <Plus className="size-4" />
        Add day
      </Button>

      <MediaPicker
        open={pickingFor !== null}
        onOpenChange={(open) => {
          if (!open) setPickingFor(null);
        }}
        onSelect={(item) => {
          if (!pickingFor) return;
          const day = days.find((candidate) => candidate.id === pickingFor);
          if (!day || day.images.includes(item.url)) return;
          patch(pickingFor, { images: [...day.images, item.url] });
        }}
      />
    </div>
  );
}
