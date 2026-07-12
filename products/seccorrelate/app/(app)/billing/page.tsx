"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free (14-Day Trial)",
    price: "$0",
    isCheckoutable: false,
    features: ["2 security integrations", "1,000 alerts/day", "AI Investigate (5 AI credits/mo)", "Basic dashboard"],
  },
  {
    code: "starter",
    name: "Starter",
    price: "$49/mo",
    isCheckoutable: true,
    features: ["10 integrations", "50,000 alerts/day", "AI correlation", "Incident timeline", "AI Investigate (20 AI credits/mo)", "Email + Slack alerts"],
  },
  {
    code: "pro",
    name: "Pro",
    price: "$199/mo",
    isCheckoutable: true,
    highlighted: true,
    features: ["25 integrations", "250,000 alerts/day", "AI threat hunting", "MITRE ATT&CK mapping", "Root cause analysis", "Playbooks", "API access", "AI Investigate (150 AI credits/mo)"],
  },
  {
    code: "business",
    name: "Business",
    price: "$449/mo",
    isCheckoutable: true,
    features: ["100 integrations", "1,000,000 alerts/day", "Everything in Pro", "Team seats", "AI Investigate (450 AI credits/mo)"],
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    isCheckoutable: false,
    features: ["Everything in Business", "Multi-tenant / MSSP", "SSO & SOC2 support", "SIEM integrations", "Unlimited AI Investigate (fair-use)", "Dedicated support & SLA"],
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
      <div className="sc-page-header">
        <div>
          <h1 className="sc-page-title">Billing</h1>
          <p className="sc-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
