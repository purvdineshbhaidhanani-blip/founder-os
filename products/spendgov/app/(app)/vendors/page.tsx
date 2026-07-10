"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Skeleton, Button, useToast } from "@founder-os/ui/primitives";

interface VendorRecommendation {
  id: string;
  vendorGroup: string;
  vendorNames: string[];
  rationale: string;
  estimatedSavingsCents: number;
}

export default function VendorsPage() {
  const { show } = useToast();
  const [recommendations, setRecommendations] = useState<VendorRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/vendors/analyze");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setRecommendations(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendor recommendations.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runAnalysis() {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/vendors/analyze", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't run analysis", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Vendor analysis complete", variant: "success" });
      await load();
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Vendor consolidation</h1>
          <p className="sg-page-description">Fragmented, low-leverage vendor relationships worth consolidating.</p>
        </div>
        <Button onClick={runAnalysis} isLoading={isAnalyzing}>
          Run analysis
        </Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : recommendations.length === 0 ? (
        <EmptyState title="No consolidation opportunities found" description="Run analysis after adding subscriptions across multiple vendors." />
      ) : (
        recommendations.map((rec) => (
          <div key={rec.id} className="sg-copilot-action">
            <div className="sg-copilot-action-header">
              <strong>{rec.vendorNames.join(" → ")}</strong>
              <span className="sg-finding-savings">${(rec.estimatedSavingsCents / 100).toLocaleString()}/mo</span>
            </div>
            <p>{rec.rationale}</p>
          </div>
        ))
      )}
    </div>
  );
}
