/**
 * Performance budgets per standards/devops.md — the numbers every
 * product's monitoring/alerting config checks against, defined once so
 * "what counts as a regression" can't drift between products.
 */
export const PERFORMANCE_BUDGETS = {
  /** Largest Contentful Paint, milliseconds. */
  LCP_MS: 2500,
  /** Interaction to Next Paint, milliseconds. */
  INP_MS: 200,
  /** Cumulative Layout Shift, unitless score. */
  CLS: 0.1,
  /** API route p95 latency, milliseconds — not a Core Web Vital, but the equivalent backend budget. */
  API_P95_MS: 500,
} as const;

export type PerformanceMetricName = keyof typeof PERFORMANCE_BUDGETS;

export function isWithinBudget(metric: PerformanceMetricName, value: number): boolean {
  return value <= PERFORMANCE_BUDGETS[metric];
}
