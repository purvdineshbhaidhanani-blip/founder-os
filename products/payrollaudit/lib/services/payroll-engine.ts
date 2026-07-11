export type PayType = "hourly" | "salaried";

export interface EmployeeCandidate {
  payType: PayType;
  hourlyRateCents: number | null;
  annualSalaryCents: number | null;
  payPeriodsPerYear: number;
}

export interface PayslipLineCandidate {
  regularHours: number;
  overtimeHours: number;
  grossPayCents: number;
  taxWithheldCents: number;
  netPayCents: number;
  attendanceHoursReported: number | null;
}

export type FindingCategory = "salary_calculation" | "tax_withholding" | "attendance_mismatch" | "overtime";
export type FindingSeverity = "low" | "medium" | "high" | "critical";

export interface PayrollFindingCandidate {
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
}

const OVERTIME_MULTIPLIER = 1.5;
const TOLERANCE_CENTS = 100;
const ATTENDANCE_TOLERANCE_HOURS = 0.25;

/**
 * Single, illustrative progressive tax-bracket table standing in for
 * one well-validated jurisdiction, per products/payrollaudit/docs/
 * PRODUCT_IDENTITY.md §27 "launch with one or two well-validated
 * jurisdictions rather than attempting broad multi-country coverage in
 * Phase 1." Additional jurisdictions are Phase 2.
 */
const TAX_BRACKETS: { upToCents: number; rate: number }[] = [
  { upToCents: 1_100_000, rate: 0.1 },
  { upToCents: 4_472_500, rate: 0.12 },
  { upToCents: 9_537_500, rate: 0.22 },
  { upToCents: Infinity, rate: 0.24 },
];

/** Gross-to-net calculation per docs/PRODUCT_IDENTITY.md §7 "Validate salary calculations against expected formulas." Salaried pay periods don't include overtime — overtime paid to a salaried employee is instead flagged as a separate compliance finding. */
export function computeExpectedGrossPayCents(employee: EmployeeCandidate, line: Pick<PayslipLineCandidate, "regularHours" | "overtimeHours">): number {
  if (employee.payType === "hourly") {
    const hourlyRateCents = employee.hourlyRateCents ?? 0;
    return Math.round(line.regularHours * hourlyRateCents + line.overtimeHours * hourlyRateCents * OVERTIME_MULTIPLIER);
  }
  const annualSalaryCents = employee.annualSalaryCents ?? 0;
  return Math.round(annualSalaryCents / employee.payPeriodsPerYear);
}

function computeAnnualTaxCents(annualizedGrossCents: number): number {
  let remaining = annualizedGrossCents;
  let tax = 0;
  let previousThreshold = 0;
  for (const bracket of TAX_BRACKETS) {
    if (remaining <= 0) break;
    const bracketWidth = bracket.upToCents - previousThreshold;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * bracket.rate;
    remaining -= taxableInBracket;
    previousThreshold = bracket.upToCents;
  }
  return Math.round(tax);
}

/** Tax withholding validation per docs/PRODUCT_IDENTITY.md §7 "Check tax withholding against applicable rules." */
export function computeExpectedTaxCents(grossPayCents: number, payPeriodsPerYear: number): number {
  const annualizedGrossCents = grossPayCents * payPeriodsPerYear;
  const annualTaxCents = computeAnnualTaxCents(annualizedGrossCents);
  return Math.round(annualTaxCents / payPeriodsPerYear);
}

function severityForCentsDelta(deltaCents: number): FindingSeverity {
  const abs = Math.abs(deltaCents);
  if (abs >= 5_000) return "critical";
  if (abs >= 1_000) return "high";
  return "medium";
}

/**
 * Validates one payslip line against expected salary calculation, tax
 * withholding, net-pay reconciliation, attendance reconciliation, and
 * overtime-eligibility rules, per docs/PRODUCT_IDENTITY.md §7's four
 * MVP validation types. Every finding carries the expected vs. actual
 * values so a payroll reviewer can verify the reasoning before acting,
 * per §27's risk mitigation.
 */
export function validatePayslipLine(employee: EmployeeCandidate, line: PayslipLineCandidate): PayrollFindingCandidate[] {
  const findings: PayrollFindingCandidate[] = [];

  const expectedGrossCents = computeExpectedGrossPayCents(employee, line);
  const grossDelta = line.grossPayCents - expectedGrossCents;
  if (Math.abs(grossDelta) > TOLERANCE_CENTS) {
    findings.push({
      ruleId: "gross_pay_mismatch",
      category: "salary_calculation",
      severity: severityForCentsDelta(grossDelta),
      title: "Gross pay does not match expected calculation",
      description: `Expected gross pay of $${(expectedGrossCents / 100).toFixed(2)} based on ${line.regularHours} regular hour(s) and ${line.overtimeHours} overtime hour(s), but the payslip reports $${(line.grossPayCents / 100).toFixed(2)}.`,
    });
  }

  const expectedTaxCents = computeExpectedTaxCents(line.grossPayCents, employee.payPeriodsPerYear);
  const taxDelta = line.taxWithheldCents - expectedTaxCents;
  if (Math.abs(taxDelta) > TOLERANCE_CENTS) {
    findings.push({
      ruleId: "tax_withholding_mismatch",
      category: "tax_withholding",
      severity: "high",
      title: "Tax withholding does not match expected calculation",
      description: `Expected tax withholding of approximately $${(expectedTaxCents / 100).toFixed(2)} for this pay period, but the payslip withheld $${(line.taxWithheldCents / 100).toFixed(2)}.`,
    });
  }

  const expectedNetCents = line.grossPayCents - line.taxWithheldCents;
  const netDelta = line.netPayCents - expectedNetCents;
  if (Math.abs(netDelta) > TOLERANCE_CENTS) {
    findings.push({
      ruleId: "net_pay_mismatch",
      category: "salary_calculation",
      severity: "medium",
      title: "Net pay does not reconcile with gross pay minus tax withheld",
      description: `Gross pay of $${(line.grossPayCents / 100).toFixed(2)} minus tax withheld of $${(line.taxWithheldCents / 100).toFixed(2)} should equal $${(expectedNetCents / 100).toFixed(2)}, but the payslip reports net pay of $${(line.netPayCents / 100).toFixed(2)}.`,
    });
  }

  if (line.attendanceHoursReported !== null) {
    const paidHours = line.regularHours + line.overtimeHours;
    const attendanceDelta = paidHours - line.attendanceHoursReported;
    if (Math.abs(attendanceDelta) > ATTENDANCE_TOLERANCE_HOURS) {
      findings.push({
        ruleId: "attendance_hours_mismatch",
        category: "attendance_mismatch",
        severity: Math.abs(attendanceDelta) >= 4 ? "high" : "medium",
        title: "Hours paid do not match attendance records",
        description: `Payslip pays for ${paidHours} hour(s), but attendance records show ${line.attendanceHoursReported} hour(s) worked for this period.`,
      });
    }
  }

  if (employee.payType === "salaried" && line.overtimeHours > 0) {
    findings.push({
      ruleId: "overtime_paid_to_salaried_employee",
      category: "overtime",
      severity: "medium",
      title: "Overtime paid to a salaried employee",
      description: `This employee is on a salaried pay type but was paid for ${line.overtimeHours} overtime hour(s). Verify their exemption classification — non-exempt salaried employees may still be entitled to overtime, but this should be an explicit, reviewed decision.`,
    });
  }

  return findings;
}

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = { critical: 25, high: 12, medium: 5, low: 1 };

/** Compliance score per the same severity-weighted formula used across this portfolio's audit products: starts at 100, deducts a severity-weighted penalty per open finding, floors at 0. */
export function computeComplianceScore(findings: { severity: string }[]): number {
  const penalty = findings.reduce((total, finding) => total + (SEVERITY_WEIGHT[finding.severity as FindingSeverity] ?? 0), 0);
  return Math.max(0, 100 - penalty);
}
