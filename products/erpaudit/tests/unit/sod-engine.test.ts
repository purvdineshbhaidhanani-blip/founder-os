import { describe, expect, it } from "vitest";
import { detectSodViolations } from "../../lib/services/sod-engine.js";

describe("detectSodViolations", () => {
  it("flags a user who can both create a vendor and approve payment", () => {
    const violations = detectSodViolations([
      { userIdentifier: "jdoe", permission: "create_vendor" },
      { userIdentifier: "jdoe", permission: "approve_payment" },
    ]);
    expect(violations.some((v) => v.ruleId === "vendor_create_approve_payment" && v.userIdentifier === "jdoe")).toBe(true);
  });

  it("does not flag a user holding only one side of a conflict pair", () => {
    const violations = detectSodViolations([{ userIdentifier: "jdoe", permission: "create_vendor" }]);
    expect(violations).toHaveLength(0);
  });

  it("does not flag two different users each holding one side of a conflict", () => {
    const violations = detectSodViolations([
      { userIdentifier: "jdoe", permission: "create_vendor" },
      { userIdentifier: "asmith", permission: "approve_payment" },
    ]);
    expect(violations).toHaveLength(0);
  });

  it("flags multiple conflict pairs independently for the same user", () => {
    const violations = detectSodViolations([
      { userIdentifier: "jdoe", permission: "create_vendor" },
      { userIdentifier: "jdoe", permission: "approve_payment" },
      { userIdentifier: "jdoe", permission: "create_purchase_order" },
      { userIdentifier: "jdoe", permission: "approve_purchase_order" },
    ]);
    expect(violations).toHaveLength(2);
  });

  it("returns no violations for an empty assignment list", () => {
    expect(detectSodViolations([])).toHaveLength(0);
  });
});
