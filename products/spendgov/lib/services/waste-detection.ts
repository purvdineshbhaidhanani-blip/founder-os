export interface WasteCandidateSubscription {
  id: string;
  monthlyCostCents: number;
  seatsPurchased: number | null;
  seatsActive: number | null;
  lastUsedAt: Date | null;
  status: string;
}

export type WasteType = "unused" | "underutilized" | "overprovisioned";

export interface WasteFindingCandidate {
  subscriptionId: string;
  type: WasteType;
  evidence: string;
  estimatedSavingsCents: number;
}

const UNUSED_UTILIZATION_THRESHOLD = 0.05;
const UNDERUTILIZED_UTILIZATION_THRESHOLD = 0.5;
const OVERPROVISIONED_MIN_UNUSED_SEATS = 10;
const STALE_LAST_USED_DAYS = 90;

/**
 * Waste identification per products/spendgov/docs/PRODUCT_IDENTITY.md §18
 * "Waste identification (unused, over-provisioned)" and §22's entitlement
 * table. Three tiers, cheapest signal first: seat-utilization ratio when
 * seat counts are tracked, falling back to usage recency when they're not.
 */
export function detectWaste(subscriptions: WasteCandidateSubscription[], now: Date = new Date()): WasteFindingCandidate[] {
  const findings: WasteFindingCandidate[] = [];

  for (const sub of subscriptions) {
    if (sub.status !== "active") continue;

    if (sub.seatsPurchased && sub.seatsPurchased > 0 && sub.seatsActive !== null) {
      const utilization = sub.seatsActive / sub.seatsPurchased;
      const unusedSeats = sub.seatsPurchased - sub.seatsActive;

      if (utilization < UNUSED_UTILIZATION_THRESHOLD) {
        findings.push({
          subscriptionId: sub.id,
          type: "unused",
          evidence: `Only ${sub.seatsActive} of ${sub.seatsPurchased} purchased seats are active (${(utilization * 100).toFixed(1)}% utilization).`,
          estimatedSavingsCents: sub.monthlyCostCents,
        });
        continue;
      }

      if (utilization < UNDERUTILIZED_UTILIZATION_THRESHOLD) {
        findings.push({
          subscriptionId: sub.id,
          type: "underutilized",
          evidence: `${sub.seatsActive} of ${sub.seatsPurchased} purchased seats are active (${(utilization * 100).toFixed(1)}% utilization).`,
          estimatedSavingsCents: Math.round(sub.monthlyCostCents * (unusedSeats / sub.seatsPurchased)),
        });
        continue;
      }

      if (unusedSeats >= OVERPROVISIONED_MIN_UNUSED_SEATS) {
        findings.push({
          subscriptionId: sub.id,
          type: "overprovisioned",
          evidence: `${unusedSeats} purchased seats (of ${sub.seatsPurchased}) are inactive even though overall utilization is ${(utilization * 100).toFixed(1)}%.`,
          estimatedSavingsCents: Math.round(sub.monthlyCostCents * (unusedSeats / sub.seatsPurchased)),
        });
      }
      continue;
    }

    if (sub.lastUsedAt) {
      const daysSinceUse = (now.getTime() - sub.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUse >= STALE_LAST_USED_DAYS) {
        findings.push({
          subscriptionId: sub.id,
          type: "unused",
          evidence: `No recorded usage in the last ${Math.floor(daysSinceUse)} days.`,
          estimatedSavingsCents: sub.monthlyCostCents,
        });
      }
    } else {
      findings.push({
        subscriptionId: sub.id,
        type: "unused",
        evidence: "No usage has ever been recorded for this subscription.",
        estimatedSavingsCents: sub.monthlyCostCents,
      });
    }
  }

  return findings.sort((a, b) => b.estimatedSavingsCents - a.estimatedSavingsCents);
}
