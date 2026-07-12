"use client";

import { Card, CardHeader, CardTitle, CardContent } from "../primitives/Card.js";
import { Button } from "../primitives/Button.js";
import { Badge } from "../primitives/Badge.js";
import { cn } from "../utils/cn.js";
import type { PlanCode } from "./PlanBadge.js";

export interface PricingPlan {
  code: PlanCode;
  name: string;
  /** Pre-formatted price string, e.g. "$29/mo" or "Custom" (Enterprise per COMMERCIAL_FREEZE.md never has a self-serve price). */
  price: string;
  features: string[];
  /** Whether this plan is checkout-able (Starter/Pro/Business) vs. Free (no-op) or Enterprise (sales-assisted, per COMMERCIAL_FREEZE.md §Step 6). */
  isCheckoutable: boolean;
  highlighted?: boolean;
}

export interface PricingCardProps {
  plan: PricingPlan;
  currentPlanCode?: PlanCode;
  onSelect?: (planCode: PlanCode) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Renders one plan's price/features/CTA — replaces the near-identical
 * `PLANS.map(...)` block every one of the 12 products previously
 * hand-rolled around the shared `Card` primitive (COMMERCIAL_FREEZE.md
 * §Section 5). A product supplies its own `PricingPlan[]` data (its
 * locked prices and feature bullets); this component owns only the
 * rendering and the current-plan/CTA state, so pricing content stays
 * product-specific while the pricing UI itself stops being duplicated.
 */
export function PricingCard({ plan, currentPlanCode, onSelect, isLoading = false, className }: PricingCardProps) {
  const isCurrentPlan = currentPlanCode === plan.code;

  return (
    <Card className={cn("fos-pricing-card", plan.highlighted && "fos-pricing-card-highlighted", className)}>
      <CardHeader>
        <div className="fos-pricing-card-header-row">
          <CardTitle>{plan.name}</CardTitle>
          {isCurrentPlan && <Badge variant="secondary">Current plan</Badge>}
        </div>
        <p className="fos-pricing-card-price">{plan.price}</p>
      </CardHeader>
      <CardContent>
        <ul className="fos-pricing-card-features">
          {plan.features.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
        {plan.isCheckoutable && !isCurrentPlan && (
          <Button onClick={() => onSelect?.(plan.code)} isLoading={isLoading} className="fos-pricing-card-cta">
            Upgrade to {plan.name}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export interface PricingGridProps {
  plans: PricingPlan[];
  currentPlanCode?: PlanCode;
  onSelect?: (planCode: PlanCode) => void;
  loadingPlanCode?: string | null;
  className?: string;
}

/** Five-tier grid wrapper — one call renders the whole Free/Starter/Pro/Business/Enterprise row. */
export function PricingGrid({ plans, currentPlanCode, onSelect, loadingPlanCode, className }: PricingGridProps) {
  return (
    <div className={cn("fos-pricing-grid", className)}>
      {plans.map((plan) => (
        <PricingCard
          key={plan.code}
          plan={plan}
          currentPlanCode={currentPlanCode}
          onSelect={onSelect}
          isLoading={loadingPlanCode === plan.code}
        />
      ))}
    </div>
  );
}
