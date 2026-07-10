export interface VendorConsolidationCandidateSubscription {
  vendorName: string;
  category: string;
  monthlyCostCents: number;
}

export interface VendorConsolidationRecommendationCandidate {
  vendorGroup: string;
  vendorNames: string[];
  rationale: string;
  estimatedSavingsCents: number;
}

const FRAGMENTED_VENDOR_SPEND_THRESHOLD_CENTS = 15_000; // $150/mo — below this, a vendor relationship has little negotiating leverage.

/**
 * Vendor consolidation analysis per
 * products/spendgov/docs/PRODUCT_IDENTITY.md §18 "Vendor consolidation
 * analysis" — surfaces low-spend, fragmented vendor relationships (the
 * long tail that dilutes negotiating leverage per Pain #6) and, where a
 * higher-spend vendor already serves the same category, recommends
 * folding the fragmented spend into that relationship instead.
 */
export function analyzeVendorConsolidation(
  subscriptions: VendorConsolidationCandidateSubscription[],
): VendorConsolidationRecommendationCandidate[] {
  const spendByVendor = new Map<string, number>();
  const categoriesByVendor = new Map<string, Set<string>>();
  for (const sub of subscriptions) {
    spendByVendor.set(sub.vendorName, (spendByVendor.get(sub.vendorName) ?? 0) + sub.monthlyCostCents);
    const categories = categoriesByVendor.get(sub.vendorName) ?? new Set<string>();
    categories.add(sub.category);
    categoriesByVendor.set(sub.vendorName, categories);
  }

  const topVendorByCategory = new Map<string, { vendorName: string; spendCents: number }>();
  for (const sub of subscriptions) {
    const current = topVendorByCategory.get(sub.category);
    const vendorTotal = spendByVendor.get(sub.vendorName) ?? 0;
    if (!current || vendorTotal > current.spendCents) {
      topVendorByCategory.set(sub.category, { vendorName: sub.vendorName, spendCents: vendorTotal });
    }
  }

  const recommendations: VendorConsolidationRecommendationCandidate[] = [];
  for (const [vendorName, totalSpendCents] of spendByVendor) {
    if (totalSpendCents >= FRAGMENTED_VENDOR_SPEND_THRESHOLD_CENTS) continue;

    const categories = [...(categoriesByVendor.get(vendorName) ?? [])];
    const candidateTarget = categories
      .map((category) => topVendorByCategory.get(category))
      .find((target) => target && target.vendorName !== vendorName);

    const rationale = candidateTarget
      ? `${vendorName} represents only ${formatMonthly(totalSpendCents)} — too little spend for meaningful negotiating leverage. Consider consolidating into ${candidateTarget.vendorName}, your largest vendor in the same category.`
      : `${vendorName} represents only ${formatMonthly(totalSpendCents)} across your account — a fragmented, low-leverage vendor relationship worth reviewing for consolidation or elimination.`;

    recommendations.push({
      vendorGroup: categories[0] ?? "uncategorized",
      vendorNames: candidateTarget ? [vendorName, candidateTarget.vendorName] : [vendorName],
      rationale,
      estimatedSavingsCents: totalSpendCents,
    });
  }

  return recommendations.sort((a, b) => b.estimatedSavingsCents - a.estimatedSavingsCents);
}

function formatMonthly(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}/mo`;
}
