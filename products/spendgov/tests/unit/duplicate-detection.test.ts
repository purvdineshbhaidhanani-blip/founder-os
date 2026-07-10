import { describe, expect, it } from "vitest";
import { detectDuplicates } from "../../lib/services/duplicate-detection.js";

describe("detectDuplicates", () => {
  it("flags a category with two distinct vendors and recommends keeping the more expensive one", () => {
    const findings = detectDuplicates([
      { id: "1", vendorName: "Atlassian", productName: "Jira", category: "project_management", monthlyCostCents: 50_00 },
      { id: "2", vendorName: "Microsoft", productName: "Azure DevOps", category: "project_management", monthlyCostCents: 20_00 },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.subscriptionIds).toEqual(["1", "2"]);
    expect(findings[0]!.estimatedSavingsCents).toBe(20_00);
    expect(findings[0]!.rationale).toContain("Jira");
  });

  it("does not flag a category with only one vendor", () => {
    const findings = detectDuplicates([
      { id: "1", vendorName: "Slack", productName: "Slack", category: "communication", monthlyCostCents: 100_00 },
    ]);
    expect(findings).toHaveLength(0);
  });

  it("sorts findings by estimated savings descending", () => {
    const findings = detectDuplicates([
      { id: "1", vendorName: "A", productName: "A1", category: "cat-small", monthlyCostCents: 10_00 },
      { id: "2", vendorName: "B", productName: "B1", category: "cat-small", monthlyCostCents: 5_00 },
      { id: "3", vendorName: "C", productName: "C1", category: "cat-big", monthlyCostCents: 500_00 },
      { id: "4", vendorName: "D", productName: "D1", category: "cat-big", monthlyCostCents: 400_00 },
    ]);
    expect(findings).toHaveLength(2);
    expect(findings[0]!.category).toBe("cat-big");
    expect(findings[1]!.category).toBe("cat-small");
  });
});
