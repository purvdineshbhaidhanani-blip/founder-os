"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free (No Card)",
    price: "$0",
    features: ["1 developer", "1 private + 3 public repos", "500 files / 20 PR scans monthly", "OWASP Top 10 detection"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$19/dev/mo",
    features: [
      "10 private repos, 50 public repos",
      "5,000 files / 300 PR scans monthly",
      "CI/CD integration",
      "AI explanations",
      "AI Fix Engine — 25 AI credits/mo",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$49/dev/mo",
    features: [
      "50 private repos, 200 public repos",
      "25,000 files / 1,500 PR scans monthly",
      "AI Fix Engine — 150 AI credits/mo",
      "Secret, dependency & container scanning",
      "Custom rules & team dashboard",
      "API access",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$89/dev/mo",
    features: [
      "200 private repos, 1,000 public repos",
      "100,000 files / 6,000 PR scans monthly",
      "AI Fix Engine — 320 AI credits/mo",
      "Everything in Pro",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Everything in Business", "Unlimited AI credits (fair use)", "SSO & SCIM", "Compliance rule packs", "Private deployment", "Dedicated support & SLA"],
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
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Billing</h1>
          <p className="ca-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
