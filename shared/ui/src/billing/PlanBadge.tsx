import { Badge, type BadgeVariant } from "../primitives/Badge.js";

/** The five plan codes locked by COMMERCIAL_FREEZE.md §Step 1 — identical set across all 12 products. */
export type PlanCode = "free" | "starter" | "pro" | "business" | "enterprise";

export interface PlanBadgeProps {
  planCode: PlanCode;
  className?: string;
}

const PLAN_LABEL: Record<PlanCode, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise",
};

/** Free reads neutral, paid tiers escalate default → info → success, Enterprise gets its own accent — never color alone (label always renders). */
const PLAN_VARIANT: Record<PlanCode, BadgeVariant> = {
  free: "secondary",
  starter: "default",
  pro: "info",
  business: "success",
  enterprise: "warning",
};

/** Small pill showing an organization's current plan — nav header, admin billing panel, pricing page "Current plan" marker. One implementation, not 12. */
export function PlanBadge({ planCode, className }: PlanBadgeProps) {
  return (
    <Badge variant={PLAN_VARIANT[planCode]} className={className}>
      {PLAN_LABEL[planCode]}
    </Badge>
  );
}
