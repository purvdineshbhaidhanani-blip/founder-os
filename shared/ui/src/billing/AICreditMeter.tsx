import { UsageMeter } from "./UsageMeter.js";

export interface AICreditMeterProps {
  current: number;
  /** null = unlimited (fair-use) — the Enterprise convention per COMMERCIAL_FREEZE.md §Section 1. */
  limit: number | null;
  isLoading?: boolean;
  className?: string;
}

/**
 * Preset of `UsageMeter` fixed to the `ai_credits_monthly` metric every AI
 * feature across all 12 products shares (COMMERCIAL_FREEZE.md §Section 1 —
 * "1 AI Credit = 1 generated AI output"). Read `current`/`limit` from
 * `getEntitlementSummary()` + `getCurrentUsage(organizationId,
 * "ai_credits_monthly")` — the same `AI_CREDITS_METRIC_KEY` exported by
 * `@founder-os/platform/billing`.
 */
export function AICreditMeter({ current, limit, isLoading = false, className }: AICreditMeterProps) {
  return <UsageMeter label="AI credits" current={current} limit={limit} isLoading={isLoading} className={className} />;
}
