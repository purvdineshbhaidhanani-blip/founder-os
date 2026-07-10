"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, Button, useToast } from "@founder-os/ui/primitives";

const PLANS = [
  { code: "free", name: "Free (No Card)", price: "$0", features: ["1 developer", "1 private + 3 public repos", "500 files / 20 PR scans monthly", "OWASP Top 10 detection"] },
  { code: "starter", name: "Starter", price: "$19/dev/mo", features: ["10 private repos, unlimited public", "5,000 files / 300 PR scans monthly", "CI/CD integration", "AI explanations"] },
  { code: "pro", name: "Pro", price: "$49/dev/mo", features: ["Unlimited repos, files, and scans", "AI Fix Engine", "Secret, dependency & container scanning", "Custom rules & team dashboard", "API access"] },
  { code: "enterprise", name: "Enterprise", price: "Custom", features: ["Everything in Pro", "SSO & SCIM", "Compliance rule packs", "Private deployment", "Dedicated support & SLA"] },
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

      <div className="ca-plan-grid">
        {PLANS.map((plan) => (
          <Card key={plan.code}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="ca-plan-price">{plan.price}</p>
            </CardHeader>
            <CardContent>
              <ul className="ca-plan-features">
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
