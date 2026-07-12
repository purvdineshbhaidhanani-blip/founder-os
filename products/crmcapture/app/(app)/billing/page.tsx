"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free (14-Day Trial)",
    price: "$0",
    features: ["1 user", "100 contacts & leads", "No AI credits", "Gmail & Outlook sync"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$29/user/mo",
    features: ["Up to 10,000 contacts & leads", "AI Lead Extraction", "30 AI credits/mo", "HubSpot, Salesforce, Zoho sync", "Basic automation"],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$79/user/mo",
    features: ["Up to 50,000 contacts & leads", "Full AI Sales Assistant", "150 AI credits/mo", "Call summaries & follow-up emails", "Lead scoring & opportunity detection", "API access"],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$149/user/mo",
    features: ["Up to 200,000 contacts & leads", "Full AI Sales Assistant", "450 AI credits/mo", "Call summaries & follow-up emails", "Lead scoring & opportunity detection", "API access"],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "Unlimited AI credits", "SSO & audit logs", "Custom CRM connectors", "Dedicated support & SLA"],
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
