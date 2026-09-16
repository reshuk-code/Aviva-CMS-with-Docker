"use client";

import { useState } from "react";

import {
  formatTierRange,
  largestTieredGroup,
  perPersonPrice,
  tierForGroupSize,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { GroupPriceTier } from "@/types/content";

/**
 * Party-size stepper and rate table for the trip page.
 *
 * A Client Component because it has a plus and a minus button, and the whole
 * value of showing a rate table is that the customer can find their own party
 * size in it. Every number it shows comes from `lib/pricing.ts`, the same
 * module the server used to quote the headline, so the two cannot disagree.
 *
 * The total is the per-person rate times the head count — the arithmetic the
 * customer is doing anyway, done out loud so nobody has to trust it.
 */
export function GroupPriceCalculator({
  tiers,
  basePrice,
  currency,
  groupSizeMin,
  groupSizeMax,
}: {
  tiers: GroupPriceTier[];
  basePrice: number | null;
  currency: string;
  groupSizeMin: number | null;
  groupSizeMax: number | null;
}) {
  const min = Math.max(1, groupSizeMin ?? 1);
  // An open-ended band means there is no ceiling in the table, so the tour's
  // own maximum party size decides — and if that is unset, pick something a
  // customer will never reach rather than allowing an unbounded counter.
  const max = Math.max(min, groupSizeMax ?? largestTieredGroup(tiers) ?? 20);

  const [people, setPeople] = useState(min);
  const [open, setOpen] = useState(false);

  const perPerson = perPersonPrice({ price: basePrice, groupPricing: tiers }, people);
  const active = tierForGroupSize(tiers, people);

  const money = (amount: number) => `${currency} ${amount.toLocaleString()}`;

  return (
    <div className="mt-5 border-t border-border pt-5">
      {tiers.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/60"
          >
            Group rates
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={cn(
                "size-4 shrink-0 transition-transform",
                open && "rotate-180",
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {open ? (
            <dl className="mt-2 divide-y divide-border rounded-md border border-border">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className={cn(
                    "flex items-center justify-between gap-4 px-3 py-2 text-sm",
                    tier.id === active?.id && "bg-muted/60 font-medium",
                  )}
                >
                  <dt>{formatTierRange(tier)}</dt>
                  <dd className="tabular-nums">{money(tier.price)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ) : null}

      <div className="mt-4">
        <label
          htmlFor="party-size"
          className="text-xs uppercase tracking-wider text-muted-foreground"
        >
          How many of you
        </label>

        <div className="mt-1.5 flex items-stretch rounded-md border border-border">
          <button
            type="button"
            onClick={() => setPeople((n) => Math.max(min, n - 1))}
            disabled={people <= min}
            aria-label="One fewer traveller"
            className="px-3 text-lg leading-none disabled:opacity-40"
          >
            −
          </button>

          <input
            id="party-size"
            type="number"
            min={min}
            max={max}
            value={people}
            onChange={(event) => {
              const raw = Number(event.target.value);
              if (!Number.isFinite(raw)) return;
              setPeople(Math.min(max, Math.max(min, Math.trunc(raw))));
            }}
            className="w-full min-w-0 border-x border-border bg-transparent py-2 text-center tabular-nums outline-none"
          />

          <button
            type="button"
            onClick={() => setPeople((n) => Math.min(max, n + 1))}
            disabled={people >= max}
            aria-label="One more traveller"
            className="px-3 text-lg leading-none disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {perPerson !== null ? (
        <div className="mt-4 space-y-1" aria-live="polite">
          <p className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Per person</span>
            <span className="tabular-nums">{money(perPerson)}</span>
          </p>
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">Total</span>
            <span className="text-xl font-semibold tabular-nums">
              {money(perPerson * people)}
            </span>
          </p>
          {tiers.length > 0 && active === null ? (
            <p className="pt-1 text-xs text-muted-foreground">
              No group rate covers a party of {people}. This is the standard
              price — ask us and we will quote it properly.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
