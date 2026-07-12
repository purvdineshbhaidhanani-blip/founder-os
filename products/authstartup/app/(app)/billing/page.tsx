"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["1 project", "1,000 MAU", "Public auth API (register/login)", "Email + OAuth login", "Password reset"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$25/mo",
    features: [
      "3 projects, 10,000 MAU",
      "Magic links & MFA",
      "Team management",
      "Basic audit logs",
      "AI Security Advisor (5 credits/mo)",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$79/mo",
    features: [
      "25 projects, 100,000 MAU",
      "Organizations, SAML & SCIM",
      "Custom domains & webhooks",
      "AI Security Advisor (40 credits/mo)",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$199/mo",
    features: [
      "100 projects, 500,000 MAU",
      "Team seats & roles",
      "Organizations, custom domains & webhooks",
      "AI Security Advisor (120 credits/mo)",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "Unlimited projects & MAU", "Dedicated cluster", "Unlimited AI credits (fair-use)", "Dedicated support & SLA"],
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
      <div className="au-page-header">
        <div>
          <h1 className="au-page-title">Billing</h1>
          <p className="au-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
