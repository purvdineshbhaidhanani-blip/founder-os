"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Select, Skeleton, ErrorState, useToast } from "@founder-os/ui/primitives";

interface FixSuggestion {
  explanation: string;
  suggestedPatch: string;
  riskScore: number;
}

interface FindingDetail {
  id: string;
  filePath: string;
  line: number;
  category: string;
  severity: string;
  status: string;
  cwe: string | null;
  title: string;
  description: string;
  snippet: string;
  fixSuggestion: FixSuggestion | null;
}

export default function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/findings/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setFinding(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load finding.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: string) {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/findings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't update status", description: body.error?.message, variant: "destructive" });
        return;
      }
      setFinding(body.data);
      show({ title: "Finding status updated", variant: "success" });
    } finally {
      setIsUpdating(false);
    }
  }

  async function generateFix() {
    setIsFixing(true);
    try {
      const response = await fetch(`/api/findings/${id}/fix`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Fix Engine unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Fix suggestion ready", variant: "success" });
      load();
    } finally {
      setIsFixing(false);
    }
  }

  if (isLoading) return <Skeleton style={{ height: 300 }} />;
  if (error || !finding) return <ErrorState description={error ?? "Finding not found."} onRetry={load} />;

  return (
    <div>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">{finding.title}</h1>
          <p className="ca-page-description">
            {finding.filePath}:{finding.line} · {finding.category}
            {finding.cwe ? ` · ${finding.cwe}` : ""}
          </p>
        </div>
        <div className="ca-form-actions">
          <Badge variant="warning">{finding.severity}</Badge>
          <Select
            name="status"
            label="Status"
            hideLabel
            value={finding.status}
            onChange={(event) => updateStatus(event.target.value)}
            disabled={isUpdating}
            options={[
              { value: "open", label: "Open" },
              { value: "fixed", label: "Fixed" },
              { value: "false_positive", label: "False positive" },
              { value: "wont_fix", label: "Won't fix" },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>{finding.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="ca-code-snippet">{finding.snippet}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Fix Engine</CardTitle>
          <CardDescription>Explanation, risk score, and a suggested production-ready patch.</CardDescription>
        </CardHeader>
        <CardContent>
          {finding.fixSuggestion ? (
            <div>
              <p>{finding.fixSuggestion.explanation}</p>
              <h3 className="ca-section-title">Risk score</h3>
              <p>{finding.fixSuggestion.riskScore} / 10</p>
              <h3 className="ca-section-title">Suggested patch</h3>
              <pre className="ca-code-snippet">{finding.fixSuggestion.suggestedPatch}</pre>
            </div>
          ) : (
            <p className="ca-page-description">No fix suggestion has been generated for this finding yet.</p>
          )}
          <div className="ca-form-actions">
            <Button onClick={generateFix} isLoading={isFixing}>
              {finding.fixSuggestion ? "Regenerate fix" : "Generate AI fix"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
