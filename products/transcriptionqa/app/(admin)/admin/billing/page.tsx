"use client";

import { useEffect, useState } from "react";
import { BillingPanel } from "@founder-os/ui/admin";

interface BillingData {
  subscription: { status: string; currentPeriodEnd: string } | null;
  entitlements: { planCode: string | null };
}

export default function AdminBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/billing")
      .then((res) => res.json())
      .then((body) => setData(body.data))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div className="tq-page-header">
        <h1 className="tq-page-title">Billing</h1>
      </div>
      <BillingPanel
        isConfigured={true}
        isLoading={isLoading}
        planName={data?.entitlements.planCode ?? undefined}
        planPrice={data?.subscription?.status}
      />
    </div>
  );
}
