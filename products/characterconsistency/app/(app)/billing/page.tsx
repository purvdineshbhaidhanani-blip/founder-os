"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["1 character", "20 generations/month", "5 style references"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$19/mo",
    features: [
      "10 characters, 500 generations/month",
      "Outfit + pose memory",
      "HD export",
      "AI Character DNA (5 AI credits/mo)",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$59/mo",
    features: [
      "50 characters, 2,500 generations/month",
      "AI Character DNA (30 AI credits/mo)",
      "Multi-character scenes & video consistency",
      "Team workspace, full API",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$129/mo",
    features: [
      "200 characters, 10,000 generations/month",
      "AI Character DNA (90 AI credits/mo)",
      "Multi-character scenes & video consistency",
      "Team workspace, full API",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited characters, generations & AI credits (fair-use)",
      "White label & private models",
      "Dedicated GPU resources",
      "SSO & audit logs",
    ],
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
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Billing</h1>
          <p className="cc-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
