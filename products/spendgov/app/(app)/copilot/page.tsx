"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorState, Skeleton, Button, Badge, Textarea, useToast } from "@founder-os/ui/primitives";

interface CopilotAction {
  title: string;
  rationale: string;
  estimatedSavingsCents: number;
  effort: "low" | "medium" | "high";
}

interface CopilotRecommendation {
  id: string;
  summary: string;
  actions: CopilotAction[];
  totalImpactCents: number;
  generatedAt: string;
}

interface ContractExtraction {
  id: string;
  vendorName: string | null;
  renewalDate: string | null;
  autoRenews: boolean | null;
  noticePeriodDays: number | null;
  keyTerms: string[];
}

export default function CopilotPage() {
  const { show } = useToast();
  const [recommendation, setRecommendation] = useState<CopilotRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractText, setContractText] = useState("");
  const [extraction, setExtraction] = useState<ContractExtraction | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/copilot/generate");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setRecommendation(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the CFO Copilot report.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/copilot/generate", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't generate report", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "CFO Copilot report generated", variant: "success" });
      await load();
    } finally {
      setIsGenerating(false);
    }
  }

  async function extractContract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsExtracting(true);
    try {
      const response = await fetch("/api/contracts/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: contractText }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't parse contract", description: body.error?.message, variant: "destructive" });
        return;
      }
      setExtraction(body.data);
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">AI CFO Copilot</h1>
          <p className="sg-page-description">A ranked, dollar-quantified action list — Pro plan.</p>
        </div>
        <Button onClick={generate} isLoading={isGenerating}>
          Generate report
        </Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !recommendation ? (
        <EmptyState title="No report yet" description="Generate your first AI CFO Copilot report to get a ranked action list." />
      ) : (
        <div className="sg-section">
          <p>{recommendation.summary}</p>
          <p className="sg-finding-savings">Total estimated impact: ${(recommendation.totalImpactCents / 100).toLocaleString()}/mo</p>
          {recommendation.actions.map((action, index) => (
            <div key={index} className="sg-copilot-action">
              <div className="sg-copilot-action-header">
                <strong>{action.title}</strong>
                <span className="sg-finding-savings">${(action.estimatedSavingsCents / 100).toLocaleString()}/mo</span>
              </div>
              <Badge variant={action.effort === "low" ? "success" : action.effort === "medium" ? "warning" : "destructive"}>{action.effort} effort</Badge>
              <p>{action.rationale}</p>
            </div>
          ))}
        </div>
      )}

      <div className="sg-section">
        <h2 className="sg-section-title">Contract parsing</h2>
        <p className="sg-page-description">Paste contract or order-form text to extract renewal terms — Pro plan.</p>
        <form onSubmit={extractContract} className="sg-auth-form">
          <Textarea name="sourceText" label="Contract text" required minLength={20} rows={8} value={contractText} onChange={(e) => setContractText(e.target.value)} />
          <Button type="submit" isLoading={isExtracting}>
            Extract terms
          </Button>
        </form>
        {extraction && (
          <div className="sg-copilot-action">
            <p>Vendor: {extraction.vendorName ?? "Not stated"}</p>
            <p>Renewal date: {extraction.renewalDate ?? "Not stated"}</p>
            <p>Auto-renews: {extraction.autoRenews === null ? "Not stated" : extraction.autoRenews ? "Yes" : "No"}</p>
            <p>Notice period: {extraction.noticePeriodDays ?? "Not stated"} days</p>
            {extraction.keyTerms.length > 0 && (
              <ul>
                {extraction.keyTerms.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
