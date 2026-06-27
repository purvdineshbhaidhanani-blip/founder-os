/**
 * Shared validation vocabulary. Both blueprint-shape validation (Phase 2) and
 * generated-agent validation (Phase 4) report results in this shape so the
 * CLI, tests, and registry can render/consume them uniformly.
 */

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  /** Stable machine-readable code, e.g. "DUPLICATE_NAME", "INVALID_TOOL". */
  code: string;
  severity: ValidationSeverity;
  message: string;
  /** Dotted path to the offending field/section, e.g. "identity.name" or "section:Workflow". */
  path?: string;
}

export interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
}

export function emptyReport(): ValidationReport {
  return { valid: true, issues: [] };
}

export function addIssue(report: ValidationReport, issue: ValidationIssue): ValidationReport {
  const issues = [...report.issues, issue];
  const valid = issues.every((entry) => entry.severity !== "error");
  return { valid, issues };
}

export function mergeReports(...reports: ValidationReport[]): ValidationReport {
  const issues = reports.flatMap((report) => report.issues);
  const valid = issues.every((entry) => entry.severity !== "error");
  return { valid, issues };
}

export function reportToString(report: ValidationReport): string {
  if (report.issues.length === 0) return "No issues found.";
  return report.issues
    .map((issue) => `[${issue.severity.toUpperCase()}] ${issue.code} ${issue.path ? `(${issue.path}) ` : ""}- ${issue.message}`)
    .join("\n");
}
