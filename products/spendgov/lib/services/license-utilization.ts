export interface LicenseSubscription {
  id: string;
  productName: string;
  monthlyCostCents: number;
  seatsPurchased: number | null;
  seatsActive: number | null;
}

export interface LicenseUtilizationRow {
  subscriptionId: string;
  productName: string;
  seatsPurchased: number;
  seatsActive: number;
  utilizationPercent: number;
  wastedSeatCostCents: number;
}

export interface LicenseUtilizationSummary {
  rows: LicenseUtilizationRow[];
  totalSeatsPurchased: number;
  totalSeatsActive: number;
  averageUtilizationPercent: number;
  totalWastedSeatCostCents: number;
}

/**
 * License utilization analysis per
 * products/spendgov/docs/PRODUCT_IDENTITY.md §18 "License utilization
 * analysis" — correlates seats purchased vs. active for right-sizing
 * decisions, independent of the waste-finding persistence flow in
 * waste-detection.ts (this is the always-fresh dashboard/report view;
 * waste-detection.ts is the persisted, actionable-finding workflow).
 */
export function summarizeLicenseUtilization(subscriptions: LicenseSubscription[]): LicenseUtilizationSummary {
  const rows: LicenseUtilizationRow[] = [];

  for (const sub of subscriptions) {
    if (!sub.seatsPurchased || sub.seatsPurchased <= 0 || sub.seatsActive === null) continue;
    const utilizationPercent = Math.min(100, (sub.seatsActive / sub.seatsPurchased) * 100);
    const wastedSeats = Math.max(0, sub.seatsPurchased - sub.seatsActive);
    rows.push({
      subscriptionId: sub.id,
      productName: sub.productName,
      seatsPurchased: sub.seatsPurchased,
      seatsActive: sub.seatsActive,
      utilizationPercent,
      wastedSeatCostCents: Math.round(sub.monthlyCostCents * (wastedSeats / sub.seatsPurchased)),
    });
  }

  const totalSeatsPurchased = rows.reduce((sum, r) => sum + r.seatsPurchased, 0);
  const totalSeatsActive = rows.reduce((sum, r) => sum + r.seatsActive, 0);

  return {
    rows: rows.sort((a, b) => a.utilizationPercent - b.utilizationPercent),
    totalSeatsPurchased,
    totalSeatsActive,
    averageUtilizationPercent: totalSeatsPurchased > 0 ? (totalSeatsActive / totalSeatsPurchased) * 100 : 0,
    totalWastedSeatCostCents: rows.reduce((sum, r) => sum + r.wastedSeatCostCents, 0),
  };
}
