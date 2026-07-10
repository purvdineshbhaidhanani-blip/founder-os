import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "../primitives/Button.js";
import { cn } from "../utils/cn.js";

export interface QuickAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  variant?: ButtonVariant;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

/**
 * The 2-5 highest-frequency actions for the primary persona, one click
 * away, per frameworks/06-dashboard-framework.md item 5. Callers are
 * responsible for only passing actions the current role can perform
 * (frameworks/09-roles-permissions.md) — a Viewer sees none.
 */
export function QuickActions({ actions, className }: QuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className={cn("fos-quick-actions", className)} role="group" aria-label="Quick actions">
      {actions.map((action) => (
        <Button key={action.id} variant={action.variant ?? "outline"} size="sm" onClick={action.onSelect}>
          {action.icon && (
            <span className="fos-quick-action-icon" aria-hidden="true">
              {action.icon}
            </span>
          )}
          {action.label}
        </Button>
      ))}
    </div>
  );
}
