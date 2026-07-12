"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["3 schemas, 100 tables tracked", "Basic schema analysis"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$19/mo",
    features: ["20 schemas, 2,000 tables tracked", "AI Database Architect (5 AI credits/mo)", "AI optimization suggestions", "Index recommendations"],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$59/mo",
    features: ["100 schemas, 10,000 tables tracked", "AI Database Architect (40 AI credits/mo)", "Migration planning, security audit, API access"],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$129/mo",
    features: ["400 schemas, 40,000 tables tracked", "AI Database Architect (120 AI credits/mo)", "Everything in Pro"],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Unlimited schemas & tables tracked", "Unlimited AI credits (fair-use)", "Oracle, Snowflake, MongoDB, BigQuery", "SSO, dedicated support & SLA"],
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
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Billing</h1>
          <p className="sl-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
