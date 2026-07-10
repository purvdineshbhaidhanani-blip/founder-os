import type { ReactNode } from "react";
import { cn } from "../utils/cn.js";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

/** Explains what's missing, why, and the primary action to resolve it — per standards/design-system.md, never just "No data." */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("fos-empty-state", className)}>
      {icon && (
        <div className="fos-empty-state-icon" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="fos-empty-state-title">{title}</h3>
      <p className="fos-empty-state-description">{description}</p>
      {action && <div className="fos-empty-state-action">{action}</div>}
    </div>
  );
}
