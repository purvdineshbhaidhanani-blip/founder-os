"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Select, Skeleton, ErrorState, useToast } from "@founder-os/ui/primitives";

interface AuditSummaryData {
  explanation: string;
  complianceImpact: string;
  recommendedFix: string;
  businessImpact: string;
}

interface FindingDetail {
  id: string;
  category: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  scan: { instance: { name: string; erpSystem: string } };
  summary: AuditSummaryData | null;
}

export default function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [finding, setFinding] = useState<FindingDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

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

  async function generateSummary() {
    setIsSummarizing(true);
    try {
      const response = await fetch(`/api/findings/${id}/summarize`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI ERP Auditor unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Audit summary ready", variant: "success" });
      load();
    } finally {
      setIsSummarizing(false);
    }
  }

  if (isLoading) return <Skeleton style={{ height: 300 }} />;
  if (error || !finding) return <ErrorState description={error ?? "Finding not found."} onRetry={load} />;

  return (
    <div>
      <div className="ea-page-header">
        <div>
          <h1 className="ea-page-title">{finding.title}</h1>
          <p className="ea-page-description">
            {finding.scan.instance.name} ({finding.scan.instance.erpSystem}) · {finding.category.replace("_", " ")}
          </p>
        </div>
        <div className="ea-form-actions">
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
              { value: "resolved", label: "Resolved" },
              { value: "accepted_risk", label: "Accepted risk" },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>{finding.description}</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI ERP Auditor</CardTitle>
          <CardDescription>Audit-ready narrative: what's wrong, compliance impact, fix, business impact.</CardDescription>
        </CardHeader>
        <CardContent>
          {finding.summary ? (
            <div>
              <p>{finding.summary.explanation}</p>
              <h3 className="ea-section-title">Compliance impact</h3>
              <p>{finding.summary.complianceImpact}</p>
              <h3 className="ea-section-title">Recommended fix</h3>
              <p>{finding.summary.recommendedFix}</p>
              <h3 className="ea-section-title">Business impact</h3>
              <p>{finding.summary.businessImpact}</p>
            </div>
          ) : (
            <p className="ea-page-description">No AI audit summary generated yet.</p>
          )}
          <div className="ea-form-actions">
            <Button onClick={generateSummary} isLoading={isSummarizing}>
              {finding.summary ? "Regenerate summary" : "Generate AI audit summary"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
