export interface DashboardGeneration {
  consistencyScore: number;
  driftWarnings: string[];
}

export interface DashboardSummary {
  totalGenerations: number;
  averageConsistencyScore: number;
  generationsWithDrift: number;
}

/** Dashboard KPI aggregation per products/characterconsistency/docs/PRODUCT_IDENTITY.md §7 dashboard requirements. */
export function summarizeDashboard(generations: DashboardGeneration[]): DashboardSummary {
  const averageConsistencyScore = generations.length === 0 ? 100 : Math.round(generations.reduce((total, g) => total + g.consistencyScore, 0) / generations.length);
  const generationsWithDrift = generations.filter((g) => g.driftWarnings.length > 0).length;

  return {
    totalGenerations: generations.length,
    averageConsistencyScore,
    generationsWithDrift,
  };
}
