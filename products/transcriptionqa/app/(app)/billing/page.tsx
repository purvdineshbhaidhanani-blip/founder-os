"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["5 uploads/month", "60 processing minutes/month", "Basic accuracy score, speaker detection"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$29/mo",
    features: [
      "100 uploads/month, 500 minutes/month",
      "AI grammar check & domain terminology validation (medical & legal)",
      "AI Accuracy Copilot — 15 AI credits/month",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$99/mo",
    features: [
      "500 uploads/month, 2,500 minutes/month",
      "Translation, compliance detection, API & webhook access",
      "AI Accuracy Copilot — 100 AI credits/month",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$229/mo",
    features: [
      "2,000 uploads/month, 10,000 minutes/month",
      "Everything in Pro",
      "AI Accuracy Copilot — 300 AI credits/month",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited uploads & processing minutes",
      "SSO, HIPAA-ready deployment",
      "Unlimited (fair-use) AI Accuracy Copilot credits, dedicated support & SLA",
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
      <div className="tq-page-header">
        <div>
          <h1 className="tq-page-title">Billing</h1>
          <p className="tq-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
