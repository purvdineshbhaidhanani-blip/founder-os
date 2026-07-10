import { describe, expect, it } from "vitest";
import { computeComplianceScore, evaluateConfigRules } from "../../lib/services/config-rules.js";

describe("evaluateConfigRules", () => {
  it("flags a missing four-eyes control", () => {
    const findings = evaluateConfigRules([{ key: "four_eyes_control_enabled", value: "false" }]);
    expect(findings.some((f) => f.ruleId === "four_eyes_control_disabled")).toBe(true);
  });

  it("does not flag four-eyes when explicitly enabled", () => {
    const findings = evaluateConfigRules([{ key: "four_eyes_control_enabled", value: "true" }]);
    expect(findings.some((f) => f.ruleId === "four_eyes_control_disabled")).toBe(false);
  });

  it("flags a missing approval threshold", () => {
    const findings = evaluateConfigRules([{ key: "four_eyes_control_enabled", value: "true" }]);
    expect(findings.some((f) => f.ruleId === "approval_threshold_not_enforced")).toBe(true);
  });

  it("flags an unusually high approval threshold", () => {
    const findings = evaluateConfigRules([
      { key: "four_eyes_control_enabled", value: "true" },
      { key: "approval_threshold_usd", value: "500000" },
    ]);
    expect(findings.some((f) => f.ruleId === "approval_threshold_too_high")).toBe(true);
  });

  it("does not flag a healthy approval threshold", () => {
    const findings = evaluateConfigRules([
      { key: "four_eyes_control_enabled", value: "true" },
      { key: "approval_threshold_usd", value: "5000" },
    ]);
    expect(findings.some((f) => f.ruleId.startsWith("approval_threshold"))).toBe(false);
  });

  it("flags passwords that never expire", () => {
    const findings = evaluateConfigRules([{ key: "password_expiry_days", value: "0" }]);
    expect(findings.some((f) => f.ruleId === "password_expiry_too_lax")).toBe(true);
  });

  it("flags disabled audit logging as critical", () => {
    const findings = evaluateConfigRules([{ key: "audit_logging_enabled", value: "false" }]);
    const finding = findings.find((f) => f.ruleId === "audit_logging_disabled");
    expect(finding?.severity).toBe("critical");
  });
});

describe("computeComplianceScore", () => {
  it("returns 100 for no findings", () => {
    expect(computeComplianceScore([])).toBe(100);
  });

  it("deducts severity-weighted penalties", () => {
    expect(computeComplianceScore([{ severity: "critical" }, { severity: "low" }])).toBe(100 - 25 - 1);
  });

  it("floors at 0", () => {
    const findings = Array.from({ length: 10 }, () => ({ severity: "critical" }));
    expect(computeComplianceScore(findings)).toBe(0);
  });
});
