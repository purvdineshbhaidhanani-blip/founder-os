export interface DuplicateCandidateSubscription {
  id: string;
  vendorName: string;
  productName: string;
  category: string;
  monthlyCostCents: number;
}

export interface DuplicateFindingCandidate {
  category: string;
  subscriptionIds: string[];
  rationale: string;
  estimatedSavingsCents: number;
}

/**
 * Duplicate/overlapping-tool detection per
 * products/spendgov/docs/PRODUCT_IDENTITY.md §18 "Duplicate tool detection"
 * and §28 AI Differentiation item 1. Two or more active subscriptions in
 * the same spend category are functionally overlapping by definition (they
 * serve the same job) — this is a stronger, more explainable signal than
 * name-string similarity, which only catches renamed/rebranded tools from
 * the same vendor. Estimated savings assumes the org would consolidate
 * down to the single most expensive (typically most-adopted) tool in the
 * group and cancel the rest.
 */
export function detectDuplicates(subscriptions: DuplicateCandidateSubscription[]): DuplicateFindingCandidate[] {
  const byCategory = new Map<string, DuplicateCandidateSubscription[]>();
  for (const sub of subscriptions) {
    const bucket = byCategory.get(sub.category) ?? [];
    bucket.push(sub);
    byCategory.set(sub.category, bucket);
  }

  const findings: DuplicateFindingCandidate[] = [];
  for (const [category, group] of byCategory) {
    const distinctVendors = new Set(group.map((s) => s.vendorName.toLowerCase()));
    if (distinctVendors.size < 2) continue;

    const sorted = [...group].sort((a, b) => b.monthlyCostCents - a.monthlyCostCents);
    const [keep, ...redundant] = sorted;
    if (!keep || redundant.length === 0) continue;

    const estimatedSavingsCents = redundant.reduce((sum, s) => sum + s.monthlyCostCents, 0);
    const vendorList = [...new Set(group.map((s) => s.vendorName))].join(", ");

    findings.push({
      category,
      subscriptionIds: group.map((s) => s.id),
      rationale: `${group.length} tools in "${category}" (${vendorList}) serve an overlapping purpose. Consolidating to ${keep.vendorName} ${keep.productName} and canceling the rest is estimated to save ${formatMonthlySavings(estimatedSavingsCents)}.`,
      estimatedSavingsCents,
    });
  }

  return findings.sort((a, b) => b.estimatedSavingsCents - a.estimatedSavingsCents);
}

function formatMonthlySavings(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}/mo`;
}
