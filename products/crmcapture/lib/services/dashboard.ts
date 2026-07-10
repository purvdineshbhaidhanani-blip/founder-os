export interface DashboardLead {
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  score: number;
}

export interface DashboardSummary {
  newLeadCount: number;
  qualifiedLeadCount: number;
  convertedLeadCount: number;
  averageScore: number;
  leadsByStatus: Record<string, number>;
}

/** Dashboard KPI aggregation per products/crmcapture/docs/PRODUCT_IDENTITY.md §7 "Unified lead dashboard." */
export function summarizeDashboard(leads: DashboardLead[]): DashboardSummary {
  const leadsByStatus: Record<string, number> = {};
  for (const lead of leads) {
    leadsByStatus[lead.status] = (leadsByStatus[lead.status] ?? 0) + 1;
  }

  const averageScore = leads.length === 0 ? 0 : Math.round(leads.reduce((total, lead) => total + lead.score, 0) / leads.length);

  return {
    newLeadCount: leadsByStatus.new ?? 0,
    qualifiedLeadCount: leadsByStatus.qualified ?? 0,
    convertedLeadCount: leadsByStatus.converted ?? 0,
    averageScore,
    leadsByStatus,
  };
}
