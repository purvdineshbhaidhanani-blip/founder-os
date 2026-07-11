"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, useToast } from "@founder-os/ui/primitives";

const PLANS = [
  { code: "free", name: "Free", price: "$0", features: ["5 uploads/month", "60 processing minutes/month", "Basic accuracy score, speaker detection"] },
  { code: "starter", name: "Starter", price: "$29/mo", features: ["Unlimited files, 500 minutes/month", "AI grammar check", "Medical & legal dictionary"] },
  { code: "pro", name: "Pro", price: "$99/mo", features: ["Unlimited minutes", "AI Accuracy Copilot", "Translation, compliance detection, API access"] },
  { code: "enterprise", name: "Enterprise", price: "Custom", features: ["Everything in Pro", "SSO, HIPAA-ready deployment", "Dedicated support & SLA"] },
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
      <div className="tq-page-header">
        <div>
          <h1 className="tq-page-title">Billing</h1>
          <p className="tq-page-description">You&rsquo;re on a 14-day trial with full Pro features.</p>
        </div>
        <Button variant="outline" onClick={openBillingPortal} isLoading={loadingPlan === "portal"}>
          Manage billing
        </Button>
      </div>

      <div className="tq-plan-grid">
        {PLANS.map((plan) => (
          <Card key={plan.code}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="tq-plan-price">{plan.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="tq-plan-features">
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
