import { Badge } from "../primitives/Badge.js";
import { EmptyState } from "../primitives/EmptyState.js";
import { cn } from "../utils/cn.js";

export type AlertSeverity = "info" | "warning" | "critical";

export interface DashboardAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description?: string;
  href?: string;
}

export interface AlertListProps {
  alerts: DashboardAlert[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
const SEVERITY_BADGE_VARIANT: Record<AlertSeverity, "destructive" | "warning" | "info"> = {
  critical: "destructive",
  warning: "warning",
  info: "info",
};

/**
 * Issues needing attention, ranked by severity — distinct from ActivityFeed
 * ("something happened"), per frameworks/06-dashboard-framework.md item 4.
 */
export function AlertList({
  alerts,
  emptyTitle = "No alerts",
  emptyDescription = "You're all caught up — nothing needs your attention right now.",
  className,
}: AlertListProps) {
  if (alerts.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} className={className} />;
  }

  const sorted = [...alerts].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  return (
    <ul className={cn("fos-alert-list", className)}>
      {sorted.map((alert) => {
        const content = (
          <>
            <Badge variant={SEVERITY_BADGE_VARIANT[alert.severity]}>{alert.severity}</Badge>
            <span className="fos-alert-list-text">
              <span className="fos-alert-list-title">{alert.title}</span>
              {alert.description && <span className="fos-alert-list-description">{alert.description}</span>}
            </span>
          </>
        );

        return (
          <li key={alert.id} className={cn("fos-alert-list-item", `fos-alert-list-item-${alert.severity}`)}>
            {alert.href ? (
              <a href={alert.href} className="fos-alert-list-link">
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
