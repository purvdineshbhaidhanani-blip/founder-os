export interface DashboardAlert {
  severity: "info" | "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "dismissed";
}

export interface DashboardSummary {
  openAlertCount: number;
  criticalOpenCount: number;
  highOpenCount: number;
  totalAlertCount: number;
  alertsBySeverity: Record<string, number>;
}

/** Dashboard KPI aggregation per products/seccorrelate/docs/PRODUCT_IDENTITY.md §7 dashboard requirements. */
export function summarizeDashboard(alerts: DashboardAlert[]): DashboardSummary {
  const open = alerts.filter((a) => a.status === "open" || a.status === "investigating");

  const alertsBySeverity: Record<string, number> = {};
  for (const alert of alerts) {
    alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] ?? 0) + 1;
  }

  return {
    openAlertCount: open.length,
    criticalOpenCount: open.filter((a) => a.severity === "critical").length,
    highOpenCount: open.filter((a) => a.severity === "high").length,
    totalAlertCount: alerts.length,
    alertsBySeverity,
  };
}
