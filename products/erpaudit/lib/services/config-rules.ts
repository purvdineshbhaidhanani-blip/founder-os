export interface ConfigSettingCandidate {
  key: string;
  value: string;
}

export interface ConfigFindingCandidate {
  ruleId: string;
  category: "config_error" | "process_deviation";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
}

/**
 * Built-in configuration/process rule library per
 * products/erpaudit/docs/PRODUCT_IDENTITY.md §7 "Process validation:
 * Flag process deviations (e.g., approval thresholds not enforced,
 * missing four-eyes controls)."
 */
export function evaluateConfigRules(settings: ConfigSettingCandidate[]): ConfigFindingCandidate[] {
  const byKey = new Map(settings.map((s) => [s.key, s.value]));
  const findings: ConfigFindingCandidate[] = [];

  const fourEyes = byKey.get("four_eyes_control_enabled");
  if (fourEyes === "false" || fourEyes === undefined) {
    findings.push({
      ruleId: "four_eyes_control_disabled",
      category: "process_deviation",
      severity: "high",
      title: "Four-eyes control is not enabled",
      description: "This ERP instance does not enforce a second-reviewer check on high-risk transactions. A single user can complete a sensitive transaction end-to-end without independent review.",
    });
  }

  const threshold = byKey.get("approval_threshold_usd");
  const thresholdValue = threshold ? Number(threshold) : NaN;
  if (threshold === undefined || Number.isNaN(thresholdValue) || thresholdValue <= 0) {
    findings.push({
      ruleId: "approval_threshold_not_enforced",
      category: "process_deviation",
      severity: "high",
      title: "Approval threshold is not enforced",
      description: "No positive approval_threshold_usd is configured, meaning transactions of any size can be processed without a required approval step.",
    });
  } else if (thresholdValue > 100_000) {
    findings.push({
      ruleId: "approval_threshold_too_high",
      category: "process_deviation",
      severity: "medium",
      title: "Approval threshold is unusually high",
      description: `Transactions under $${thresholdValue.toLocaleString()} bypass approval — this threshold is high enough that most transactions in a mid-market company would never require sign-off.`,
    });
  }

  const passwordExpiry = byKey.get("password_expiry_days");
  const passwordExpiryValue = passwordExpiry ? Number(passwordExpiry) : NaN;
  if (passwordExpiry !== undefined && !Number.isNaN(passwordExpiryValue) && (passwordExpiryValue === 0 || passwordExpiryValue > 180)) {
    findings.push({
      ruleId: "password_expiry_too_lax",
      category: "config_error",
      severity: "medium",
      title: "Password expiry policy is too lax",
      description: `password_expiry_days is set to ${passwordExpiryValue}${passwordExpiryValue === 0 ? " (passwords never expire)" : " days"}, which exceeds common SOX-adjacent password rotation guidance of 90 days.`,
    });
  }

  const auditLogging = byKey.get("audit_logging_enabled");
  if (auditLogging === "false") {
    findings.push({
      ruleId: "audit_logging_disabled",
      category: "config_error",
      severity: "critical",
      title: "Audit logging is disabled",
      description: "This ERP instance has audit logging turned off. Without it, no configuration or transaction change is traceable — a foundational control for any compliance framework.",
    });
  }

  return findings;
}

const SEVERITY_WEIGHT: Record<string, number> = { critical: 25, high: 12, medium: 5, low: 1 };

/** Compliance score per products/erpaudit/docs/PRODUCT_IDENTITY.md §7 "Risk dashboard: Compliance score." Starts at 100, deducts a severity-weighted penalty per open finding, floors at 0. */
export function computeComplianceScore(findings: { severity: string }[]): number {
  const penalty = findings.reduce((total, finding) => total + (SEVERITY_WEIGHT[finding.severity] ?? 0), 0);
  return Math.max(0, 100 - penalty);
}
