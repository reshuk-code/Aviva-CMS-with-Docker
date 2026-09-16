import type { GroupPriceTier } from "@/types/content";

/**
 * Group-size pricing: which rate a party of N pays, and how to say so.
 *
 * Deliberately free of `server-only`, for the same reason `lib/rich-text.ts`
 * is: three callers need identical answers and two of them are not on the
 * server. The tour repository resolves a "from" price with it, the trip page
 * renders a rate table from it, and the party-size stepper — a Client
 * Component, because it has a plus and a minus button — recalculates with it
 * on every click. A second implementation in the browser would eventually
 * disagree with the one that quoted the price.
 *
 * These are lookup and formatting rules, not business rules. What a tier may
 * contain — no overlaps, one open-ended band, a sane minimum — is enforced by
 * `schemas/tour.ts` before anything reaches a repository.
 */

/** Ascending by party size. Tiers are stored in whatever order they were typed. */
export function sortGroupTiers(tiers: GroupPriceTier[]): GroupPriceTier[] {
  return [...tiers].sort((a, b) => a.minPeople - b.minPeople);
}

/** The tier covering a party of `people`, or null when none does. */
export function tierForGroupSize(
  tiers: GroupPriceTier[],
  people: number,
): GroupPriceTier | null {
  return (
    tiers.find(
      (tier) =>
        people >= tier.minPeople &&
        (tier.maxPeople === null || people <= tier.maxPeople),
    ) ?? null
  );
}

/**
 * What one person pays in a party of `people`.
 *
 * Falls back to the tour's flat price when no tier covers that size. A gap in
 * the table is not an error — an operator may price 1-4 and 8+ and handle
 * 5-7 by conversation — so the flat price is the sensible answer rather than
 * "unavailable".
 */
export function perPersonPrice(
  tour: { price: number | null; groupPricing: GroupPriceTier[] },
  people: number,
): number | null {
  return tierForGroupSize(tour.groupPricing, people)?.price ?? tour.price;
}

/**
 * The lowest per-person rate on offer, for a "from" headline.
 *
 * Reads the tiers rather than trusting `price`, because the whole point of a
 * group table is that the largest party pays least — a headline taken from
 * `price` alone would quote the solo rate as the cheapest one.
 */
export function lowestPrice(tour: {
  price: number | null;
  groupPricing: GroupPriceTier[];
}): number | null {
  const rates = tour.groupPricing.map((tier) => tier.price);
  if (tour.price !== null) rates.push(tour.price);
  return rates.length > 0 ? Math.min(...rates) : null;
}

/** "1 person", "3-4 people", "8+ people". */
export function formatTierRange(tier: GroupPriceTier): string {
  if (tier.maxPeople === null) return `${tier.minPeople}+ people`;
  if (tier.maxPeople === tier.minPeople) {
    return `${tier.minPeople} ${tier.minPeople === 1 ? "person" : "people"}`;
  }
  return `${tier.minPeople}–${tier.maxPeople} people`;
}

/**
 * The largest party the table caters for, for a stepper's upper bound.
 *
 * Null when a tier is open-ended, which means "no ceiling here" — the caller
 * decides what to do with that, usually falling back to the tour's own
 * `groupSizeMax`.
 */
export function largestTieredGroup(tiers: GroupPriceTier[]): number | null {
  if (tiers.length === 0) return null;
  if (tiers.some((tier) => tier.maxPeople === null)) return null;
  return Math.max(...tiers.map((tier) => tier.maxPeople ?? 0));
}
