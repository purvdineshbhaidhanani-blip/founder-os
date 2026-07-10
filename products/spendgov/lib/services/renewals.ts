export interface RenewalCandidateSubscription {
  id: string;
  vendorName: string;
  productName: string;
  monthlyCostCents: number;
  renewalDate: Date | null;
}

export interface UpcomingRenewal {
  subscriptionId: string;
  vendorName: string;
  productName: string;
  monthlyCostCents: number;
  renewalDate: Date;
  daysUntilRenewal: number;
}

const DEFAULT_LOOKAHEAD_DAYS = 90;

/**
 * Renewal calendar per products/spendgov/docs/PRODUCT_IDENTITY.md §18
 * "Renewal calendar (parse contracts, alert 90+ days)" — surfaces
 * subscriptions renewing within the lookahead window, soonest first, so
 * procurement can start negotiation before auto-renewal fires.
 */
export function getUpcomingRenewals(
  subscriptions: RenewalCandidateSubscription[],
  lookaheadDays: number = DEFAULT_LOOKAHEAD_DAYS,
  now: Date = new Date(),
): UpcomingRenewal[] {
  const cutoff = new Date(now.getTime() + lookaheadDays * 24 * 60 * 60 * 1000);

  return subscriptions
    .filter((sub): sub is RenewalCandidateSubscription & { renewalDate: Date } => sub.renewalDate !== null)
    .filter((sub) => sub.renewalDate >= now && sub.renewalDate <= cutoff)
    .map((sub) => ({
      subscriptionId: sub.id,
      vendorName: sub.vendorName,
      productName: sub.productName,
      monthlyCostCents: sub.monthlyCostCents,
      renewalDate: sub.renewalDate,
      daysUntilRenewal: Math.ceil((sub.renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);
}
