"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, useToast } from "@founder-os/ui/primitives";

const PLANS = [
  { code: "free", name: "Free", price: "$0", features: ["1 project", "1,000 MAU", "Email + OAuth login", "Password reset"] },
  { code: "starter", name: "Starter", price: "$25/mo", features: ["1 project, 10,000 MAU", "Magic links & MFA", "Team management", "Basic audit logs"] },
  { code: "pro", name: "Pro", price: "$79/mo", features: ["Unlimited projects, 100,000 MAU", "Organizations, SAML & SCIM", "Custom domains & webhooks", "AI Security Advisor"] },
  { code: "enterprise", name: "Enterprise", price: "Custom", features: ["Everything in Pro", "Unlimited MAU", "Dedicated cluster", "Dedicated support & SLA"] },
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

      <div className="au-plan-grid">
        {PLANS.map((plan) => (
          <Card key={plan.code}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="au-plan-price">{plan.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="au-plan-features">
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
