import type { ReactNode } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "../primitives/Card.js";
import { Skeleton } from "../primitives/Skeleton.js";
import { cn } from "../utils/cn.js";

export type TrendDirection = "up" | "down" | "flat";

export interface KPISparklinePoint {
  value: number;
}

export interface KPICardProps {
  label: string;
  value: string;
  /** Percentage change vs. the previous period, e.g. 12.4 for +12.4%. Sign is inferred from `trendDirection`. */
  trendValue?: number;
  trendDirection?: TrendDirection;
  /** Whether an "up" trend is good for this metric — false for metrics like churn or error rate. */
  trendIsPositive?: boolean;
  sparkline?: KPISparklinePoint[];
  icon?: ReactNode;
  isLoading?: boolean;
  className?: string;
}

const TREND_GLYPH: Record<TrendDirection, string> = {
  up: "↑",
  down: "↓",
  flat: "→",
};

/** Headline metric per frameworks/06-dashboard-framework.md: value + trend, never a bare number. */
export function KPICard({
  label,
  value,
  trendValue,
  trendDirection = "flat",
  trendIsPositive = true,
  sparkline,
  icon,
  isLoading = false,
  className,
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn("fos-kpi-card", className)}>
        <CardContent className="fos-kpi-card-content">
          <Skeleton className="fos-kpi-skeleton-label" />
          <Skeleton className="fos-kpi-skeleton-value" />
        </CardContent>
      </Card>
    );
  }

  const trendIsGood = trendDirection === "flat" ? true : (trendDirection === "up") === trendIsPositive;

  return (
    <Card className={cn("fos-kpi-card", className)}>
      <CardContent className="fos-kpi-card-content">
        <div className="fos-kpi-card-header">
          <span className="fos-kpi-label">{label}</span>
          {icon && (
            <span className="fos-kpi-icon" aria-hidden="true">
              {icon}
            </span>
          )}
        </div>
        <div className="fos-kpi-value-row">
          <span className="fos-kpi-value">{value}</span>
          {sparkline && sparkline.length > 1 && (
            <div className="fos-kpi-sparkline" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkline}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={trendIsGood ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {trendValue !== undefined && (
          <div
            className={cn("fos-kpi-trend", trendIsGood ? "fos-kpi-trend-positive" : "fos-kpi-trend-negative")}
          >
            <span aria-hidden="true">{TREND_GLYPH[trendDirection]}</span>
            <span>
              {Math.abs(trendValue).toFixed(1)}% vs. previous period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
