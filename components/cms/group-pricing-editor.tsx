"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { formatTierRange, sortGroupTiers } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { GroupPriceTier } from "@/types/content";

/** Column names as the editor sees them, for error messages. */
const TIER_FIELD_LABELS: Record<string, string> = {
  minPeople: "From",
  maxPeople: "To",
  price: "Price",
};

/**
 * Per-person rates by party size.
 *
 * Posts one hidden field of JSON rather than parallel inputs, for the same
 * reason the itinerary editor does: a row is three related values, and
 * `formData.getAll()` on three separate names cannot say which minimum belongs
 * to which price once a row in the middle is deleted.
 *
 * Rows are shown in the order they were typed, not sorted as you type. Sorting
 * live would move the row out from under the cursor of anyone who starts a
 * band by typing its maximum. The repository sorts on save instead.
 */
export function GroupPricingEditor({
  name,
  defaultValue,
  currency,
  errors = {},
}: {
  name: string;
  defaultValue: GroupPriceTier[];
  /** Shown beside each price so the editor knows what they are typing. */
  currency: string;
  /**
   * The whole field-error map. A rejected row reports under
   * `groupPricing.0.minPeople`, so the row has to find its own messages.
   */
  errors?: Record<string, string[]>;
}) {
  const [tiers, setTiers] = useState<GroupPriceTier[]>(defaultValue);

  function patch(id: string, changes: Partial<GroupPriceTier>) {
    setTiers((current) =>
      current.map((tier) => (tier.id === id ? { ...tier, ...changes } : tier)),
    );
  }

  /** Every problem on one band, each named by the column it came from. */
  function rowErrors(index: number): string[] {
    const prefix = `${name}.${index}.`;

    return Object.entries(errors)
      .filter(([key]) => key.startsWith(prefix))
      .flatMap(([key, messages]) => {
        const field = key.slice(prefix.length).split(".")[0];
        const label = TIER_FIELD_LABELS[field] ?? field;
        return messages.map((message) => `${label}: ${message}`);
      });
  }

  function addRow() {
    // Start the new band one above the highest maximum so far, which is what
    // the editor was going to type anyway.
    const highest = tiers.reduce(
      (max, tier) => Math.max(max, tier.maxPeople ?? tier.minPeople),
      0,
    );

    setTiers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        minPeople: highest + 1,
        maxPeople: null,
        price: 0,
      },
    ]);
  }

  const preview = sortGroupTiers(tiers);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(tiers)} />

      {tiers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No group rates. Everyone pays the price above, whatever the party
          size.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left">
                <th className="pb-1 pr-3 font-medium">
                  From
                  <span className="block text-xs font-normal text-muted-foreground">
                    Smallest party
                  </span>
                </th>
                <th className="pb-1 pr-3 font-medium">
                  To
                  <span className="block text-xs font-normal text-muted-foreground">
                    Blank means no upper limit
                  </span>
                </th>
                <th className="pb-1 pr-3 font-medium">
                  Price
                  <span className="block text-xs font-normal text-muted-foreground">
                    Per person, {currency}
                  </span>
                </th>
                <th className="pb-1">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {tiers.map((tier, index) => {
                const problems = rowErrors(index);

                return (
                  <tr key={tier.id} className="align-top">
                    <td className="py-1 pr-3">
                      <Label
                        htmlFor={`tier-min-${tier.id}`}
                        className="sr-only"
                      >
                        Smallest party for row {index + 1}
                      </Label>
                      <Input
                        id={`tier-min-${tier.id}`}
                        type="number"
                        min={1}
                        value={tier.minPeople}
                        onChange={(event) =>
                          patch(tier.id, {
                            minPeople: Number(event.target.value) || 1,
                          })
                        }
                      />
                    </td>

                    <td className="py-1 pr-3">
                      <Label
                        htmlFor={`tier-max-${tier.id}`}
                        className="sr-only"
                      >
                        Largest party for row {index + 1}
                      </Label>
                      <Input
                        id={`tier-max-${tier.id}`}
                        type="number"
                        min={1}
                        value={tier.maxPeople ?? ""}
                        placeholder="and above"
                        onChange={(event) => {
                          const raw = event.target.value.trim();
                          patch(tier.id, {
                            maxPeople: raw === "" ? null : Number(raw),
                          });
                        }}
                      />
                    </td>

                    <td className="py-1 pr-3">
                      <Label
                        htmlFor={`tier-price-${tier.id}`}
                        className="sr-only"
                      >
                        Per-person price for row {index + 1}
                      </Label>
                      <Input
                        id={`tier-price-${tier.id}`}
                        type="number"
                        min={0}
                        step="1"
                        value={tier.price}
                        onChange={(event) =>
                          patch(tier.id, {
                            price: Number(event.target.value) || 0,
                          })
                        }
                      />
                    </td>

                    <td className="py-1">
                      <button
                        type="button"
                        onClick={() =>
                          setTiers((current) =>
                            current.filter((row) => row.id !== tier.id),
                          )
                        }
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Remove row ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>

                    {problems.length > 0 ? (
                      <td colSpan={4} className="pb-2">
                        <ul
                          data-field-error
                          className="space-y-0.5 text-xs text-destructive"
                        >
                          {problems.map((problem) => (
                            <li key={problem}>{problem}</li>
                          ))}
                        </ul>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          <Plus className="size-4" />
          Add Row
        </Button>

        {tiers.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Customers will see:{" "}
            {preview.map((tier, index) => (
              <span
                key={tier.id}
                className={cn(index > 0 && "before:content-['_·_']")}
              >
                {formatTierRange(tier)} {currency}{" "}
                {tier.price.toLocaleString()}
              </span>
            ))}
          </p>
        ) : null}
      </div>
    </div>
  );
}
