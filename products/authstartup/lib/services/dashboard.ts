export interface DashboardFinding {
  status: "open" | "resolved" | "dismissed";
  severity: "low" | "medium" | "high";
}

export interface DashboardSummary {
  openFindingCount: number;
  highOpenCount: number;
  totalFindingCount: number;
}

/** Dashboard KPI aggregation per products/authstartup/docs/PRODUCT_IDENTITY.md §7 "Developer dashboard." */
export function summarizeDashboard(findings: DashboardFinding[]): DashboardSummary {
  const open = findings.filter((f) => f.status === "open");
  return {
    openFindingCount: open.length,
    highOpenCount: open.filter((f) => f.severity === "high").length,
    totalFindingCount: findings.length,
  };
}
