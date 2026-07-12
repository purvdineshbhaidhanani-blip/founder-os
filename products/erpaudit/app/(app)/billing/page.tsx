"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["1 ERP instance", "2 users", "5 configuration scans/month", "7 days of history"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$49/mo",
    features: [
      "5 ERP instances, 10 users",
      "100 configuration scans/month",
      "AI ERP Auditor (10 AI credits/mo)",
      "AI risk detection",
      "SoD & process checks",
      "90 days of history",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$149/mo",
    features: [
      "25 ERP instances, 50 users",
      "500 configuration scans/month",
      "AI ERP Auditor (80 AI credits/mo)",
      "Approval workflows & multi-company",
      "API access",
      "2 years of history",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$349/mo",
    features: [
      "100 ERP instances, 200 users",
      "2,000 configuration scans/month",
      "AI ERP Auditor (240 AI credits/mo)",
      "Approval workflows & multi-company",
      "API access",
      "5 years of history",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "SSO & SCIM", "Unlimited AI credits (fair-use)", "Custom ERP connectors", "Dedicated support & SLA"],
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
      <div className="ea-page-header">
        <div>
          <h1 className="ea-page-title">Billing</h1>
          <p className="ea-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
