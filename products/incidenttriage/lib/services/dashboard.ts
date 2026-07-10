export interface DashboardIncident {
  status: "open" | "investigating" | "resolved";
  severity: "info" | "warning" | "critical";
}

export interface DashboardSummary {
  openIncidentCount: number;
  criticalOpenCount: number;
  totalIncidentCount: number;
  incidentsBySeverity: Record<string, number>;
}

/** Dashboard KPI aggregation per products/incidenttriage/docs/PRODUCT_IDENTITY.md §7 "Incident dashboard." */
export function summarizeDashboard(incidents: DashboardIncident[]): DashboardSummary {
  const open = incidents.filter((i) => i.status === "open" || i.status === "investigating");

  const incidentsBySeverity: Record<string, number> = {};
  for (const incident of incidents) {
    incidentsBySeverity[incident.severity] = (incidentsBySeverity[incident.severity] ?? 0) + 1;
  }

  return {
    openIncidentCount: open.length,
    criticalOpenCount: open.filter((i) => i.severity === "critical").length,
    totalIncidentCount: incidents.length,
    incidentsBySeverity,
  };
}
