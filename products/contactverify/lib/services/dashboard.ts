export interface DashboardContact {
  emailStatus: "valid" | "invalid" | "risky" | "unchecked";
  healthScore: number;
}

export interface DashboardSummary {
  totalContacts: number;
  verifiedContacts: number;
  invalidContacts: number;
  averageHealthScore: number;
}

/** Dashboard KPI aggregation per products/contactverify/docs/PRODUCT_IDENTITY.md §7 "Dashboard." */
export function summarizeDashboard(contacts: DashboardContact[]): DashboardSummary {
  const verifiedContacts = contacts.filter((c) => c.emailStatus === "valid").length;
  const invalidContacts = contacts.filter((c) => c.emailStatus === "invalid").length;
  const averageHealthScore = contacts.length === 0 ? 0 : Math.round(contacts.reduce((total, c) => total + c.healthScore, 0) / contacts.length);

  return {
    totalContacts: contacts.length,
    verifiedContacts,
    invalidContacts,
    averageHealthScore,
  };
}
