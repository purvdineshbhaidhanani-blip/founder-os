"use client";

import { useState } from "react";
import { Button, useToast } from "@founder-os/ui/primitives";
import { PricingGrid, type PricingPlan } from "@founder-os/ui/billing";

const PLANS: PricingPlan[] = [
  {
    code: "free",
    name: "Free",
    price: "$0",
    features: ["1 company, 20 employees", "1 payroll run/month", "Payroll validation engine + compliance score"],
    isCheckoutable: false,
  },
  {
    code: "starter",
    name: "Starter",
    price: "$39/mo",
    features: [
      "2 companies, 250 employees",
      "20 payroll runs/month",
      "Tax + overtime validation, attendance import",
      "AI Payroll Copilot (basic) — 4 AI credits/mo",
    ],
    isCheckoutable: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "$129/mo",
    features: [
      "10 companies, 2,000 employees",
      "100 payroll runs/month",
      "AI Payroll Copilot (full) — 15 AI credits/mo",
      "Salary forecasting, workflow approvals, API access, audit log",
    ],
    isCheckoutable: true,
    highlighted: true,
  },
  {
    code: "business",
    name: "Business",
    price: "$299/mo",
    features: [
      "40 companies, 10,000 employees",
      "400 payroll runs/month",
      "Everything in Pro",
      "AI Payroll Copilot — 45 AI credits/mo (team-scale pool)",
    ],
    isCheckoutable: true,
  },
  {
    code: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: [
      "Unlimited companies, employees, and payroll runs",
      "Everything in Business",
      "SSO, SCIM",
      "Unlimited AI credits (fair-use), dedicated support & SLA",
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
      <div className="pa-page-header">
        <div>
          <h1 className="pa-page-title">Billing</h1>
          <p className="pa-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <PricingGrid plans={PLANS} onSelect={startCheckout} loadingPlanCode={loadingPlan} />
    </div>
  );
}
