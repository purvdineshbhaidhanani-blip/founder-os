"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, useToast } from "@founder-os/ui/primitives";

const PLANS = [
  { code: "free", name: "Free", price: "$0", features: ["1 company, 20 employees", "1 payroll run/month", "Basic payroll validation"] },
  { code: "starter", name: "Starter", price: "$39/mo", features: ["250 employees, unlimited runs", "Tax + overtime validation", "AI error detection (basic)", "Attendance import"] },
  { code: "pro", name: "Pro", price: "$129/mo", features: ["Unlimited employees, multi-company", "AI Payroll Copilot", "Salary forecasting", "Workflow approvals, API access, audit log"] },
  { code: "enterprise", name: "Enterprise", price: "Custom", features: ["Everything in Pro", "Unlimited companies", "SSO, SCIM", "Dedicated support & SLA"] },
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

      <div className="pa-plan-grid">
        {PLANS.map((plan) => (
          <Card key={plan.code}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="pa-plan-price">{plan.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="pa-plan-features">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {(plan.code === "starter" || plan.code === "pro") && (
                <Button onClick={() => startCheckout(plan.code)} isLoading={loadingPlan === plan.code}>
                  Upgrade to {plan.name}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
