export interface DashboardFinding {
  status: "open" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  category: "terminology" | "speaker_attribution";
}

export interface DashboardSummary {
  openFindingCount: number;
  terminologyFindingCount: number;
  speakerFindingCount: number;
  totalFindingCount: number;
}

/** Dashboard KPI aggregation per docs/PRODUCT_IDENTITY.md §7 "Reports: Exportable quality reports." */
export function summarizeDashboard(findings: DashboardFinding[]): DashboardSummary {
  const open = findings.filter((f) => f.status === "open");
  return {
    openFindingCount: open.length,
    terminologyFindingCount: open.filter((f) => f.category === "terminology").length,
    speakerFindingCount: open.filter((f) => f.category === "speaker_attribution").length,
    totalFindingCount: findings.length,
  };
}
