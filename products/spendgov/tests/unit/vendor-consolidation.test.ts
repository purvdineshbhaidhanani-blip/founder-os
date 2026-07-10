import { describe, expect, it } from "vitest";
import { analyzeVendorConsolidation } from "../../lib/services/vendor-consolidation.js";

describe("analyzeVendorConsolidation", () => {
  it("flags a low-spend vendor and recommends the category's top spender as a consolidation target", () => {
    const recommendations = analyzeVendorConsolidation([
      { vendorName: "BigVendor", category: "analytics", monthlyCostCents: 5000_00 },
      { vendorName: "TinyVendor", category: "analytics", monthlyCostCents: 50_00 },
    ]);
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]!.vendorNames).toEqual(["TinyVendor", "BigVendor"]);
    expect(recommendations[0]!.rationale).toContain("BigVendor");
  });

  it("flags a low-spend vendor with no same-category alternative as a general fragmentation finding", () => {
    const recommendations = analyzeVendorConsolidation([
      { vendorName: "SoloVendor", category: "niche_tool", monthlyCostCents: 40_00 },
    ]);
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]!.vendorNames).toEqual(["SoloVendor"]);
  });

  it("does not flag vendors above the fragmentation threshold", () => {
    const recommendations = analyzeVendorConsolidation([
      { vendorName: "BigVendor", category: "analytics", monthlyCostCents: 5000_00 },
    ]);
    expect(recommendations).toHaveLength(0);
  });

  it("sorts by estimated savings descending", () => {
    const recommendations = analyzeVendorConsolidation([
      { vendorName: "A", category: "x", monthlyCostCents: 30_00 },
      { vendorName: "B", category: "y", monthlyCostCents: 100_00 },
    ]);
    expect(recommendations.map((r) => r.vendorNames[0])).toEqual(["B", "A"]);
  });
});
