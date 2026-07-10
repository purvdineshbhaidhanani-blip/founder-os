import type { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../primitives/Card.js";
import { Skeleton } from "../primitives/Skeleton.js";
import { EmptyState } from "../primitives/EmptyState.js";
import { ErrorState } from "../primitives/ErrorState.js";
import { cn } from "../utils/cn.js";

export interface ChartCardProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  /** Plain-language error description, never the raw error object. */
  error?: string;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Per frameworks/06-dashboard-framework.md, every chart earns its place by
 * explaining a KPI, and every data region defines loading/empty/error
 * independently so one failing widget never takes down the dashboard.
 */
export function ChartCard({
  title,
  description,
  isLoading = false,
  error,
  onRetry,
  isEmpty = false,
  emptyTitle = "No data yet",
  emptyDescription = "Data will appear here once activity starts flowing in.",
  actions,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn("fos-chart-card", className)}>
      <CardHeader className="fos-chart-card-header">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="fos-chart-card-actions">{actions}</div>}
      </CardHeader>
      <CardContent className="fos-chart-card-content">
        {isLoading ? (
          <Skeleton className="fos-chart-skeleton" />
        ) : error ? (
          <ErrorState title="Couldn't load this chart" description={error} onRetry={onRetry} />
        ) : isEmpty ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div className="fos-chart-card-body">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
