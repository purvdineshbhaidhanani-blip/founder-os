"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, useToast } from "@founder-os/ui/primitives";

const PLANS = [
  { code: "free", name: "Free", price: "$0", features: ["1 character", "20 generations/month", "5 style references"] },
  { code: "starter", name: "Starter", price: "$19/mo", features: ["10 characters, 500 generations/month", "Outfit + pose memory", "HD export"] },
  { code: "pro", name: "Pro", price: "$59/mo", features: ["Unlimited characters & generations", "AI Character DNA / Story Memory", "Multi-character scenes & video consistency", "Team workspace, full API"] },
  { code: "enterprise", name: "Enterprise", price: "Custom", features: ["Everything in Pro", "White label & private models", "Dedicated GPU resources", "SSO & audit logs"] },
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

      <div className="cc-plan-grid">
        {PLANS.map((plan) => (
          <Card key={plan.code}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="cc-plan-price">{plan.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="cc-plan-features">
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
