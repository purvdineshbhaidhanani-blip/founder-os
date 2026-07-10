import { describe, expect, it } from "vitest";
import { computeHealthScore } from "../../lib/services/health-score.js";

describe("computeHealthScore", () => {
  it("scores a fully complete, valid, non-duplicate contact highly", () => {
    const score = computeHealthScore({ emailStatus: "valid", phoneStatus: "valid", hasCompany: true, hasJobTitle: true, isDuplicate: false });
    expect(score).toBe(90);
  });

  it("scores a bare unchecked contact at 0", () => {
    const score = computeHealthScore({ emailStatus: "unchecked", phoneStatus: "unchecked", hasCompany: false, hasJobTitle: false, isDuplicate: false });
    expect(score).toBe(0);
  });

  it("deducts for duplicate status", () => {
    const withDupe = computeHealthScore({ emailStatus: "valid", phoneStatus: "valid", hasCompany: false, hasJobTitle: false, isDuplicate: true });
    const withoutDupe = computeHealthScore({ emailStatus: "valid", phoneStatus: "valid", hasCompany: false, hasJobTitle: false, isDuplicate: false });
    expect(withDupe).toBe(withoutDupe - 20);
  });

  it("floors at 0 and never goes negative", () => {
    const score = computeHealthScore({ emailStatus: "invalid", phoneStatus: "invalid", hasCompany: false, hasJobTitle: false, isDuplicate: true });
    expect(score).toBe(0);
  });

  it("gives partial credit for risky status", () => {
    const score = computeHealthScore({ emailStatus: "risky", phoneStatus: "risky", hasCompany: false, hasJobTitle: false, isDuplicate: false });
    expect(score).toBe(25);
  });
});
