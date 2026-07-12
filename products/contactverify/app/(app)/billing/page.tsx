"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["500 verifications/month", "Email & phone validation", "Basic duplicate detection", "No AI credits"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$29/mo",
    features: [
      "10,000 verifications/month",
      "AI Contact Health Engine",
      "20 AI credits/mo",
      "AI-assisted duplicate detection",
      "Basic enrichment",
      "CRM sync",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$99/mo",
    features: [
      "50,000 verifications/month",
      "AI Contact Health Engine",
      "150 AI credits/mo",
      "AI data enrichment & duplicate merge",
      "Workflow automation",
      "Unlimited API",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$229/mo",
    features: [
      "200,000 verifications/month",
      "AI Contact Health Engine",
      "450 AI credits/mo",
      "AI data enrichment & duplicate merge",
      "Workflow automation",
      "Unlimited API",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "Unlimited AI credits (fair-use)", "SSO & SCIM", "Custom integrations", "Dedicated support & SLA"],
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
      <div className="cv-page-header">
        <div>
          <h1 className="cv-page-title">Billing</h1>
          <p className="cv-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
