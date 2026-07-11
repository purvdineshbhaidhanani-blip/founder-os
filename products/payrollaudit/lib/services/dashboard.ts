export interface DashboardFinding {
  status: "open" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  category: "salary_calculation" | "tax_withholding" | "attendance_mismatch" | "overtime";
}

export interface DashboardSummary {
  openFindingCount: number;
  criticalOpenCount: number;
  taxFindingCount: number;
  attendanceFindingCount: number;
  totalFindingCount: number;
}

/** Dashboard KPI aggregation per docs/PRODUCT_IDENTITY.md §7 "Payroll reports: Payroll cost summary, error trend, compliance score over time." */
export function summarizeDashboard(findings: DashboardFinding[]): DashboardSummary {
  const open = findings.filter((f) => f.status === "open");
  return {
    openFindingCount: open.length,
    criticalOpenCount: open.filter((f) => f.severity === "critical").length,
    taxFindingCount: open.filter((f) => f.category === "tax_withholding").length,
    attendanceFindingCount: open.filter((f) => f.category === "attendance_mismatch").length,
    totalFindingCount: findings.length,
  };
}
