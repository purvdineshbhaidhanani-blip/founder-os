import { describe, expect, it } from "vitest";
import {
  computeComplianceScore,
  computeExpectedGrossPayCents,
  computeExpectedTaxCents,
  validatePayslipLine,
  type EmployeeCandidate,
} from "../../lib/services/payroll-engine.js";

const hourlyEmployee: EmployeeCandidate = {
  payType: "hourly",
  hourlyRateCents: 2500,
  annualSalaryCents: null,
  payPeriodsPerYear: 26,
};

const salariedEmployee: EmployeeCandidate = {
  payType: "salaried",
  hourlyRateCents: null,
  annualSalaryCents: 7_800_000,
  payPeriodsPerYear: 26,
};

describe("computeExpectedGrossPayCents", () => {
  it("computes regular + 1.5x overtime for hourly employees", () => {
    const grossCents = computeExpectedGrossPayCents(hourlyEmployee, { regularHours: 80, overtimeHours: 5 });
    expect(grossCents).toBe(80 * 2500 + 5 * 2500 * 1.5);
  });

  it("computes annual salary divided by pay periods for salaried employees, ignoring overtime hours", () => {
    const grossCents = computeExpectedGrossPayCents(salariedEmployee, { regularHours: 80, overtimeHours: 3 });
    expect(grossCents).toBe(Math.round(7_800_000 / 26));
  });
});

describe("computeExpectedTaxCents", () => {
  it("applies the progressive bracket table to the annualized gross pay", () => {
    const taxCents = computeExpectedTaxCents(300_000, 26);
    expect(taxCents).toBeGreaterThan(0);
    expect(taxCents).toBeLessThan(300_000);
  });

  it("scales up for higher income (more of the salary falls in higher brackets)", () => {
    const lowTax = computeExpectedTaxCents(150_000, 26);
    const highTax = computeExpectedTaxCents(600_000, 26);
    expect(highTax / 600_000).toBeGreaterThan(lowTax / 150_000);
  });
});

describe("validatePayslipLine", () => {
  it("produces no findings for a correctly calculated hourly payslip line", () => {
    const grossPayCents = computeExpectedGrossPayCents(hourlyEmployee, { regularHours: 80, overtimeHours: 0 });
    const taxWithheldCents = computeExpectedTaxCents(grossPayCents, 26);
    const findings = validatePayslipLine(hourlyEmployee, {
      regularHours: 80,
      overtimeHours: 0,
      grossPayCents,
      taxWithheldCents,
      netPayCents: grossPayCents - taxWithheldCents,
      attendanceHoursReported: 80,
    });
    expect(findings).toHaveLength(0);
    expect(computeComplianceScore(findings)).toBe(100);
  });

  it("flags a gross pay mismatch when reported gross pay is wrong", () => {
    const findings = validatePayslipLine(hourlyEmployee, {
      regularHours: 80,
      overtimeHours: 0,
      grossPayCents: 500_000,
      taxWithheldCents: 0,
      netPayCents: 500_000,
      attendanceHoursReported: null,
    });
    expect(findings.some((f) => f.ruleId === "gross_pay_mismatch")).toBe(true);
  });

  it("flags a tax withholding mismatch when withheld tax is far from expected", () => {
    const grossPayCents = computeExpectedGrossPayCents(hourlyEmployee, { regularHours: 80, overtimeHours: 0 });
    const findings = validatePayslipLine(hourlyEmployee, {
      regularHours: 80,
      overtimeHours: 0,
      grossPayCents,
      taxWithheldCents: 0,
      netPayCents: grossPayCents,
      attendanceHoursReported: null,
    });
    expect(findings.some((f) => f.ruleId === "tax_withholding_mismatch")).toBe(true);
  });

  it("flags a net pay mismatch when net doesn't equal gross minus tax", () => {
    const grossPayCents = computeExpectedGrossPayCents(hourlyEmployee, { regularHours: 80, overtimeHours: 0 });
    const taxWithheldCents = computeExpectedTaxCents(grossPayCents, 26);
    const findings = validatePayslipLine(hourlyEmployee, {
      regularHours: 80,
      overtimeHours: 0,
      grossPayCents,
      taxWithheldCents,
      netPayCents: grossPayCents - taxWithheldCents - 100_000,
      attendanceHoursReported: null,
    });
    expect(findings.some((f) => f.ruleId === "net_pay_mismatch")).toBe(true);
  });

  it("flags an attendance mismatch when paid hours differ from attendance records", () => {
    const grossPayCents = computeExpectedGrossPayCents(hourlyEmployee, { regularHours: 80, overtimeHours: 0 });
    const taxWithheldCents = computeExpectedTaxCents(grossPayCents, 26);
    const findings = validatePayslipLine(hourlyEmployee, {
      regularHours: 80,
      overtimeHours: 0,
      grossPayCents,
      taxWithheldCents,
      netPayCents: grossPayCents - taxWithheldCents,
      attendanceHoursReported: 65,
    });
    expect(findings.some((f) => f.ruleId === "attendance_hours_mismatch")).toBe(true);
  });

  it("flags overtime paid to a salaried employee", () => {
    const grossPayCents = computeExpectedGrossPayCents(salariedEmployee, { regularHours: 80, overtimeHours: 4 });
    const taxWithheldCents = computeExpectedTaxCents(grossPayCents, 26);
    const findings = validatePayslipLine(salariedEmployee, {
      regularHours: 80,
      overtimeHours: 4,
      grossPayCents,
      taxWithheldCents,
      netPayCents: grossPayCents - taxWithheldCents,
      attendanceHoursReported: 84,
    });
    expect(findings.some((f) => f.ruleId === "overtime_paid_to_salaried_employee")).toBe(true);
  });
});

describe("computeComplianceScore", () => {
  it("deducts a severity-weighted penalty per finding and floors at 0", () => {
    expect(computeComplianceScore([])).toBe(100);
    expect(computeComplianceScore([{ severity: "medium" }])).toBe(95);
    expect(computeComplianceScore([{ severity: "critical" }, { severity: "critical" }, { severity: "critical" }, { severity: "critical" }, { severity: "critical" }])).toBe(0);
  });
});
