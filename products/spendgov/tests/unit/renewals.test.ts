import { describe, expect, it } from "vitest";
import { getUpcomingRenewals } from "../../lib/services/renewals.js";

describe("getUpcomingRenewals", () => {
  const now = new Date("2026-07-10T00:00:00Z");

  it("includes a renewal within the lookahead window", () => {
    const renewals = getUpcomingRenewals(
      [{ id: "1", vendorName: "Slack", productName: "Slack", monthlyCostCents: 100_00, renewalDate: new Date("2026-08-15T00:00:00Z") }],
      90,
      now,
    );
    expect(renewals).toHaveLength(1);
    expect(renewals[0]!.daysUntilRenewal).toBe(36);
  });

  it("excludes a renewal beyond the lookahead window", () => {
    const renewals = getUpcomingRenewals(
      [{ id: "1", vendorName: "Slack", productName: "Slack", monthlyCostCents: 100_00, renewalDate: new Date("2027-01-01T00:00:00Z") }],
      90,
      now,
    );
    expect(renewals).toHaveLength(0);
  });

  it("excludes subscriptions without a renewal date", () => {
    const renewals = getUpcomingRenewals([{ id: "1", vendorName: "Slack", productName: "Slack", monthlyCostCents: 100_00, renewalDate: null }], 90, now);
    expect(renewals).toHaveLength(0);
  });

  it("sorts soonest renewal first", () => {
    const renewals = getUpcomingRenewals(
      [
        { id: "1", vendorName: "A", productName: "A", monthlyCostCents: 10_00, renewalDate: new Date("2026-09-01T00:00:00Z") },
        { id: "2", vendorName: "B", productName: "B", monthlyCostCents: 10_00, renewalDate: new Date("2026-07-20T00:00:00Z") },
      ],
      90,
      now,
    );
    expect(renewals.map((r) => r.subscriptionId)).toEqual(["2", "1"]);
  });
});
