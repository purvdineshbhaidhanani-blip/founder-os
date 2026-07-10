import { describe, expect, it } from "vitest";
import { summarizeLicenseUtilization } from "../../lib/services/license-utilization.js";

describe("summarizeLicenseUtilization", () => {
  it("computes per-subscription utilization and wasted seat cost", () => {
    const summary = summarizeLicenseUtilization([
      { id: "1", productName: "Figma", monthlyCostCents: 1000_00, seatsPurchased: 100, seatsActive: 40 },
    ]);
    expect(summary.rows).toHaveLength(1);
    expect(summary.rows[0]!.utilizationPercent).toBe(40);
    expect(summary.rows[0]!.wastedSeatCostCents).toBe(600_00);
  });

  it("skips subscriptions without seat tracking", () => {
    const summary = summarizeLicenseUtilization([
      { id: "1", productName: "Notion", monthlyCostCents: 50_00, seatsPurchased: null, seatsActive: null },
    ]);
    expect(summary.rows).toHaveLength(0);
  });

  it("aggregates org-wide totals and average utilization", () => {
    const summary = summarizeLicenseUtilization([
      { id: "1", productName: "A", monthlyCostCents: 100_00, seatsPurchased: 100, seatsActive: 50 },
      { id: "2", productName: "B", monthlyCostCents: 100_00, seatsPurchased: 100, seatsActive: 100 },
    ]);
    expect(summary.totalSeatsPurchased).toBe(200);
    expect(summary.totalSeatsActive).toBe(150);
    expect(summary.averageUtilizationPercent).toBe(75);
  });

  it("sorts rows by utilization ascending (worst first)", () => {
    const summary = summarizeLicenseUtilization([
      { id: "1", productName: "HighUtil", monthlyCostCents: 100_00, seatsPurchased: 100, seatsActive: 90 },
      { id: "2", productName: "LowUtil", monthlyCostCents: 100_00, seatsPurchased: 100, seatsActive: 10 },
    ]);
    expect(summary.rows.map((r) => r.productName)).toEqual(["LowUtil", "HighUtil"]);
  });
});
