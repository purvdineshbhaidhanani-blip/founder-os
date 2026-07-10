export interface HealthCandidateAlert {
  severity: "info" | "warning" | "critical";
}

/**
 * Derives a service's current health status from its recent alerts, per
 * products/incidenttriage/docs/PRODUCT_IDENTITY.md §7 "Service health
 * dashboard: Real-time status per service (healthy, degraded, down)
 * based on ingested signals." Any critical alert means down; two or more
 * warnings (without a critical) means degraded; otherwise healthy.
 */
export function computeServiceHealth(recentAlerts: HealthCandidateAlert[]): "healthy" | "degraded" | "down" {
  const hasCritical = recentAlerts.some((a) => a.severity === "critical");
  if (hasCritical) return "down";

  const warningCount = recentAlerts.filter((a) => a.severity === "warning").length;
  if (warningCount >= 2) return "degraded";

  return "healthy";
}
