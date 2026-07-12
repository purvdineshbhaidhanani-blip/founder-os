"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free (14-Day Trial)",
    price: "$0",
    features: ["1 organization", "25 SaaS apps tracked", "10 AI tools tracked", "14 days of history"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$29/mo",
    features: [
      "3 organizations",
      "100 SaaS apps tracked",
      "50 AI tools tracked",
      "AI CFO Copilot",
      "AI spend optimization",
      "15 AI credits/mo",
      "Duplicate detection",
      "Slack alerts",
      "90 days of history",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$99/mo",
    features: [
      "10 organizations",
      "500 SaaS apps tracked",
      "250 AI tools tracked",
      "AI CFO Copilot",
      "AI spend optimization",
      "80 AI credits/mo",
      "License optimization",
      "Approval workflows",
      "API access",
      "Forecasting",
      "3 years of history",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$249/mo",
    features: [
      "25 organizations",
      "2,000 SaaS apps tracked",
      "1,000 AI tools tracked",
      "AI CFO Copilot",
      "AI spend optimization",
      "240 AI credits/mo",
      "License optimization",
      "Approval workflows",
      "API access",
      "Forecasting",
      "5 years of history",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "SSO & SCIM", "Unlimited AI credits (fair-use)", "Custom retention", "Dedicated support"],
    isCheckoutable: false,
  },
];

export default function BillingPage() {
  const { show } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function startCheckout(planCode: string) {
    setLoadingPlan(planCode);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Checkout unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      window.location.href = body.data.checkoutUrl;
    } finally {
      setLoadingPlan(null);
    }
  }

  async function openBillingPortal() {
    setLoadingPlan("portal");
    try {
      const response = await fetch("/api/billing/portal", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Billing portal unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      window.location.href = body.data.portalUrl;
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Billing</h1>
          <p className="sg-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
