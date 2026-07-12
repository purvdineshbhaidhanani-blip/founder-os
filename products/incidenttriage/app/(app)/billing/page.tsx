"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["1 project", "2 team members", "100 incidents/mo", "AI Root Cause Copilot (5 AI credits/mo)", "7-day history"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$39/mo",
    features: ["5 projects, 10 members", "1,000 incidents/mo", "AI Root Cause Copilot (8 AI credits/mo)", "90-day history", "Slack & Jira"],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$149/mo",
    features: [
      "25 projects, 50 members",
      "5,000 incidents/mo",
      "AI Incident Copilot & recovery suggestions (60 AI credits/mo)",
      "Advanced analytics & custom dashboards",
      "API access",
      "730-day history",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$349/mo",
    features: [
      "100 projects, 200 members",
      "20,000 incidents/mo",
      "AI Incident Copilot & recovery suggestions (180 AI credits/mo)",
      "Advanced analytics & custom dashboards",
      "API access",
      "5-year history",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "SSO & SCIM", "Unlimited AI credits (fair use)", "Custom history retention", "Dedicated support & SLA"],
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
      <div className="it-page-header">
        <div>
          <h1 className="it-page-title">Billing</h1>
          <p className="it-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
