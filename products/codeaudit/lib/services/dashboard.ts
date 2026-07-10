export interface DashboardFinding {
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "fixed" | "false_positive" | "wont_fix";
  category: "vulnerability" | "secret" | "quality" | "dependency";
}

export interface DashboardSummary {
  openFindingCount: number;
  criticalOpenCount: number;
  highOpenCount: number;
  totalFindingCount: number;
  findingsByCategory: Record<string, number>;
}

/** Dashboard KPI aggregation per products/codeaudit/docs/PRODUCT_IDENTITY.md §7 "Unified dashboard." */
export function summarizeDashboard(findings: DashboardFinding[]): DashboardSummary {
  const open = findings.filter((f) => f.status === "open");

  const findingsByCategory: Record<string, number> = {};
  for (const finding of findings) {
    findingsByCategory[finding.category] = (findingsByCategory[finding.category] ?? 0) + 1;
  }

  return {
    openFindingCount: open.length,
    criticalOpenCount: open.filter((f) => f.severity === "critical").length,
    highOpenCount: open.filter((f) => f.severity === "high").length,
    totalFindingCount: findings.length,
    findingsByCategory,
  };
}

/** Average health score across a set of repository scans — 100 when there are no scans yet (nothing scanned = no known issues). */
export function averageHealthScore(scores: number[]): number {
  if (scores.length === 0) return 100;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}
