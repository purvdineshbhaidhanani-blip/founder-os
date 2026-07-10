"use client";

import { useEffect, useState } from "react";
import { EmptyState, ErrorState, Skeleton, Button, useToast } from "@founder-os/ui/primitives";

interface DuplicateFinding {
  id: string;
  category: string;
  rationale: string;
  estimatedSavingsCents: number;
  subscriptions: { subscription: { vendorName: string; productName: string } }[];
}

export default function DuplicatesPage() {
  const { show } = useToast();
  const [findings, setFindings] = useState<DuplicateFinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/duplicates/detect");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setFindings(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load duplicate findings.");
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
      const response = await fetch("/api/duplicates/detect", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't run detection", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Duplicate detection complete", variant: "success" });
      await load();
    } finally {
      setIsDetecting(false);
    }
  }

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Duplicate tools</h1>
          <p className="sg-page-description">Tools serving the same purpose across your subscriptions — consolidate to save.</p>
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
        <EmptyState title="No duplicates found" description="Run detection after adding subscriptions to check for overlapping tools." />
      ) : (
        findings.map((finding) => (
          <div key={finding.id} className="sg-copilot-action">
            <div className="sg-copilot-action-header">
              <strong>{finding.category}</strong>
              <span className="sg-finding-savings">${(finding.estimatedSavingsCents / 100).toLocaleString()}/mo</span>
            </div>
            <p>{finding.rationale}</p>
          </div>
        ))
      )}
    </div>
  );
}
