"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Skeleton, Button, Badge, useToast } from "@founder-os/ui/primitives";

interface WasteFinding {
  id: string;
  type: "unused" | "underutilized" | "overprovisioned";
  evidence: string;
  estimatedSavingsCents: number;
  subscription: { vendorName: string; productName: string };
}

export default function WastePage() {
  const { show } = useToast();
  const [findings, setFindings] = useState<WasteFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/waste/detect");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setFindings(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load waste findings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runDetection() {
    setIsDetecting(true);
    try {
      const response = await fetch("/api/waste/detect", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't run detection", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Waste detection complete", variant: "success" });
      await load();
    } finally {
      setIsDetecting(false);
    }
  }

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Waste identification</h1>
          <p className="sg-page-description">Unused, underutilized, and over-provisioned subscriptions.</p>
        </div>
        <Button onClick={runDetection} isLoading={isDetecting}>
          Run detection
        </Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : findings.length === 0 ? (
        <EmptyState title="No waste found" description="Run detection after adding subscriptions with seat/usage data." />
      ) : (
        findings.map((finding) => (
          <div key={finding.id} className="sg-copilot-action">
            <div className="sg-copilot-action-header">
              <strong>
                {finding.subscription.vendorName} {finding.subscription.productName}
              </strong>
              <span className="sg-finding-savings">${(finding.estimatedSavingsCents / 100).toLocaleString()}/mo</span>
            </div>
            <Badge variant={finding.type === "unused" ? "destructive" : "warning"}>{finding.type.replace("_", " ")}</Badge>
            <p>{finding.evidence}</p>
          </div>
        ))
      )}
    </div>
  );
}
