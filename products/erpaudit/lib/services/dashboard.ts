export interface DashboardFinding {
  status: "open" | "resolved" | "accepted_risk";
  severity: "low" | "medium" | "high" | "critical";
  category: "sod_violation" | "config_error" | "process_deviation";
}

export interface DashboardSummary {
  openFindingCount: number;
  criticalOpenCount: number;
  sodViolationCount: number;
  totalFindingCount: number;
}

/** Dashboard KPI aggregation per products/erpaudit/docs/PRODUCT_IDENTITY.md §7 "Risk dashboard." */
export function summarizeDashboard(findings: DashboardFinding[]): DashboardSummary {
  const open = findings.filter((f) => f.status === "open");
  return {
    openFindingCount: open.length,
    criticalOpenCount: open.filter((f) => f.severity === "critical").length,
    sodViolationCount: open.filter((f) => f.category === "sod_violation").length,
    totalFindingCount: findings.length,
  };
}
