export interface DashboardFinding {
  status: "open" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  category: "indexing" | "naming" | "integrity";
}

export interface DashboardSummary {
  openFindingCount: number;
  criticalOpenCount: number;
  indexingFindingCount: number;
  integrityFindingCount: number;
  totalFindingCount: number;
}

/** Dashboard KPI aggregation per docs/PRODUCT_IDENTITY.md §7 "Performance report: Summarize schema-level performance risk." */
export function summarizeDashboard(findings: DashboardFinding[]): DashboardSummary {
  const open = findings.filter((f) => f.status === "open");
  return {
    openFindingCount: open.length,
    criticalOpenCount: open.filter((f) => f.severity === "critical").length,
    indexingFindingCount: open.filter((f) => f.category === "indexing").length,
    integrityFindingCount: open.filter((f) => f.category === "integrity").length,
    totalFindingCount: findings.length,
  };
}
