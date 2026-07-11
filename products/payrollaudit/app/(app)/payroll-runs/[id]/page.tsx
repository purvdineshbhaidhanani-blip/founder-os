"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, useToast } from "@founder-os/ui/primitives";

interface FindingRow {
  id: string;
  ruleId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  employee: { fullName: string; employeeCode: string };
}

interface PayrollRunDetail {
  id: string;
  periodStart: string;
  periodEnd: string;
  complianceScore: number;
  company: { name: string };
  findings: FindingRow[];
  copilotSummary: string | null;
  copilotRecommendedFixes: string[];
  copilotRiskLevel: string | null;
}

function scoreVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 90) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

function severityVariant(severity: string): "destructive" | "warning" | "info" | "default" {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "medium") return "warning";
  return "info";
}

export default function PayrollRunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCopilot, setIsRunningCopilot] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/payroll-runs/${id}`);
      const body = await response.json();
      if (response.ok) setRun(body.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runCopilot() {
    setIsRunningCopilot(true);
    try {
      const response = await fetch(`/api/payroll-runs/${id}/copilot`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Payroll Copilot unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Copilot brief ready", variant: "success" });
      load();
    } finally {
      setIsRunningCopilot(false);
    }
  }

  async function resolveFinding(findingId: string) {
    setResolvingId(findingId);
    try {
      const response = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't resolve finding", description: body.error?.message, variant: "destructive" });
        return;
      }
      load();
    } finally {
      setResolvingId(null);
    }
  }

  if (isLoading || !run) return <p className="pa-page-description">Loading…</p>;

  return (
    <div>
      <div className="pa-page-header">
        <div>
          <h1 className="pa-page-title">{run.company.name} payroll run</h1>
          <p className="pa-page-description">
            {new Date(run.periodStart).toLocaleDateString()} – {new Date(run.periodEnd).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={scoreVariant(run.complianceScore)}>Compliance score {run.complianceScore}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Payroll Copilot</CardTitle>
          <CardDescription>Explains this run&rsquo;s findings in plain language and recommends fixes before disbursement.</CardDescription>
        </CardHeader>
        <CardContent>
          {run.copilotSummary ? (
            <div className="pa-copilot-action">
              <div className="pa-copilot-action-header">
                <strong>Risk level: {run.copilotRiskLevel}</strong>
              </div>
              <p>{run.copilotSummary}</p>
              {run.copilotRecommendedFixes.length > 0 && (
                <ul className="pa-category-list">
                  {run.copilotRecommendedFixes.map((fix) => (
                    <li key={fix}>{fix}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="pa-page-description">No Copilot brief generated yet.</p>
          )}
          <div className="pa-form-actions">
            <Button onClick={runCopilot} isLoading={isRunningCopilot}>
              {run.copilotSummary ? "Regenerate brief" : "Generate Copilot brief"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings ({run.findings.length})</CardTitle>
          <CardDescription>Every discrepancy this run's payslip lines produced against expected calculations.</CardDescription>
        </CardHeader>
        <CardContent>
          {run.findings.length === 0 ? (
            <p className="pa-page-description">No findings — every payslip line reconciled cleanly.</p>
          ) : (
            run.findings.map((finding) => (
              <div key={finding.id} className="pa-copilot-action">
                <div className="pa-copilot-action-header">
                  <strong>
                    {finding.employee.fullName} ({finding.employee.employeeCode}) — {finding.title}
                  </strong>
                  <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                </div>
                <p>{finding.description}</p>
                <div className="pa-form-actions">
                  {finding.status === "open" ? (
                    <Button variant="outline" onClick={() => resolveFinding(finding.id)} isLoading={resolvingId === finding.id}>
                      Mark resolved
                    </Button>
                  ) : (
                    <Badge variant="success">Resolved</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
