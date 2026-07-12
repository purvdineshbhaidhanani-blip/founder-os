import { Skeleton } from "../primitives/Skeleton.js";
import { cn } from "../utils/cn.js";

export interface UsageMeterProps {
  label: string;
  current: number;
  /** null = unlimited (COMMERCIAL_FREEZE.md's Enterprise convention) — renders as a plain count with no bar. */
  limit: number | null;
  isLoading?: boolean;
  /** Fraction (0–1) of the limit at which the meter switches to its warning color. Defaults to 0.8 (80%). */
  warningThreshold?: number;
  className?: string;
}

/**
 * Generic "N of M used this period" progress meter backed by
 * `getCurrentUsage(organizationId, metricKey)` — the same shared
 * `UsageCounter` mechanism every numeric_limit entitlement already uses
 * (COMMERCIAL_FREEZE.md §Section 3 dependency map), whether that's
 * `saas_apps_tracked`, `employees`, or `ai_credits_monthly`. `AICreditMeter`
 * is a thin preset of this component, not a separate implementation.
 */
export function UsageMeter({ label, current, limit, isLoading = false, warningThreshold = 0.8, className }: UsageMeterProps) {
  if (isLoading) {
    return (
      <div className={cn("fos-usage-meter", className)}>
        <Skeleton className="fos-usage-meter-skeleton-label" />
        <Skeleton className="fos-usage-meter-skeleton-bar" />
      </div>
    );
  }

  if (limit === null) {
    return (
      <div className={cn("fos-usage-meter", className)}>
        <div className="fos-usage-meter-header">
          <span className="fos-usage-meter-label">{label}</span>
          <span className="fos-usage-meter-value">{current.toLocaleString()} · Unlimited</span>
        </div>
      </div>
    );
  }

  const ratio = limit === 0 ? 1 : Math.min(current / limit, 1);
  const isAtLimit = current >= limit;
  const isWarning = !isAtLimit && ratio >= warningThreshold;

  return (
    <div className={cn("fos-usage-meter", className)}>
      <div className="fos-usage-meter-header">
        <span className="fos-usage-meter-label">{label}</span>
        <span className="fos-usage-meter-value">
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div
        className="fos-usage-meter-track"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={label}
      >
        <div
          className={cn(
            "fos-usage-meter-fill",
            isAtLimit ? "fos-usage-meter-fill-limit" : isWarning ? "fos-usage-meter-fill-warning" : "fos-usage-meter-fill-normal",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {isAtLimit && <p className="fos-usage-meter-limit-message">You&rsquo;ve reached this plan&rsquo;s limit. Upgrade for more.</p>}
    </div>
  );
}
