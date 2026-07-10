"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, useToast } from "@founder-os/ui/primitives";

interface Recommendation {
  explanation: string;
  recommendedAction: string;
}

interface FindingRow {
  id: string;
  ruleId: string;
  severity: "low" | "medium" | "high";
  status: "open" | "resolved" | "dismissed";
  title: string;
  description: string;
  project: { name: string };
  recommendation: Recommendation | null;
}

const SEVERITY_BADGE: Record<string, "default" | "warning" | "destructive"> = {
  low: "default",
  medium: "warning",
  high: "destructive",
};

export default function SecurityPage() {
  const { show } = useToast();
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendingId, setRecommendingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/security");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setFindings(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security findings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function requestRecommendation(findingId: string) {
    setRecommendingId(findingId);
    try {
      const response = await fetch(`/api/security/${findingId}/recommend`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Security Advisor unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Recommendation ready", variant: "success" });
      load();
    } finally {
      setRecommendingId(null);
    }
  }

  async function updateStatus(findingId: string, status: string) {
    const response = await fetch(`/api/security/${findingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const body = await response.json();
      show({ title: "Couldn't update finding", description: body.error?.message, variant: "destructive" });
      return;
    }
    load();
  }

  return (
    <div>
      <div className="au-page-header">
        <div>
          <h1 className="au-page-title">Security Advisor</h1>
          <p className="au-page-description">Findings from every project's security posture rule engine.</p>
        </div>
      </div>

      {isLoading ? (
        <p className="au-page-description">Loading…</p>
      ) : error ? (
        <p className="au-page-description">{error}</p>
      ) : findings.length === 0 ? (
        <p className="au-page-description">No findings — run the Security Advisor from a project page.</p>
      ) : (
        findings.map((finding) => (
          <Card key={finding.id}>
            <CardHeader>
              <CardTitle>{finding.title}</CardTitle>
              <CardDescription>
                {finding.project.name} · <Badge variant={SEVERITY_BADGE[finding.severity]}>{finding.severity}</Badge> · {finding.status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>{finding.description}</p>
              {finding.recommendation ? (
                <div>
                  <h3 className="au-section-title">Why it matters</h3>
                  <p>{finding.recommendation.explanation}</p>
                  <h3 className="au-section-title">Recommended action</h3>
                  <p>{finding.recommendation.recommendedAction}</p>
                </div>
              ) : (
                <p className="au-page-description">No AI recommendation generated yet.</p>
              )}
              <div className="au-form-actions">
                {finding.status === "open" && (
                  <>
                    <Button variant="outline" onClick={() => updateStatus(finding.id, "resolved")}>
                      Mark resolved
                    </Button>
                    <Button variant="outline" onClick={() => updateStatus(finding.id, "dismissed")}>
                      Dismiss
                    </Button>
                  </>
                )}
                <Button onClick={() => requestRecommendation(finding.id)} isLoading={recommendingId === finding.id}>
                  {finding.recommendation ? "Regenerate recommendation" : "Get AI recommendation"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
