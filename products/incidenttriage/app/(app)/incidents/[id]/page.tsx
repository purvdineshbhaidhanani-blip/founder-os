"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Select, Skeleton, ErrorState, useToast } from "@founder-os/ui/primitives";

interface AlertRow {
  id: string;
  source: string;
  message: string;
  severity: string;
  occurredAt: string;
}

interface RootCauseAnalysis {
  hypothesis: string;
  confidence: number;
  culpritService: string;
  suggestedFix: string;
  estimatedRecoveryMinutes: number;
}

interface IncidentDetail {
  id: string;
  title: string;
  severity: string;
  status: string;
  startedAt: string;
  service: { name: string };
  alerts: AlertRow[];
  rootCauseAnalysis: RootCauseAnalysis | null;
}

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/incidents/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setIncident(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incident.");
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
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't update status", description: body.error?.message, variant: "destructive" });
        return;
      }
      setIncident(body.data);
      show({ title: "Incident status updated", variant: "success" });
    } finally {
      setIsUpdating(false);
    }
  }

  async function runAnalysis() {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/incidents/${id}/analyze`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Root Cause Copilot unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Root cause analysis ready", variant: "success" });
      load();
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) return <Skeleton style={{ height: 300 }} />;
  if (error || !incident) return <ErrorState description={error ?? "Incident not found."} onRetry={load} />;

  return (
    <div>
      <div className="it-page-header">
        <div>
          <h1 className="it-page-title">{incident.title}</h1>
          <p className="it-page-description">
            {incident.service.name} · Started {new Date(incident.startedAt).toLocaleString()}
          </p>
        </div>
        <div className="it-form-actions">
          <Badge variant="warning">{incident.severity}</Badge>
          <Select
            name="status"
            label="Status"
            hideLabel
            value={incident.status}
            onChange={(event) => updateStatus(event.target.value)}
            disabled={isUpdating}
            options={[
              { value: "open", label: "Open" },
              { value: "investigating", label: "Investigating" },
              { value: "resolved", label: "Resolved" },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert timeline ({incident.alerts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="it-category-list">
            {incident.alerts.map((alert) => (
              <li key={alert.id}>
                [{new Date(alert.occurredAt).toLocaleString()}] ({alert.severity}, {alert.source}) {alert.message}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Root Cause Copilot</CardTitle>
          <CardDescription>What happened, why, and how to fix it.</CardDescription>
        </CardHeader>
        <CardContent>
          {incident.rootCauseAnalysis ? (
            <div>
              <p>{incident.rootCauseAnalysis.hypothesis}</p>
              <h3 className="it-section-title">Confidence</h3>
              <p>{incident.rootCauseAnalysis.confidence}%</p>
              <h3 className="it-section-title">Culprit service</h3>
              <p>{incident.rootCauseAnalysis.culpritService}</p>
              <h3 className="it-section-title">Suggested fix</h3>
              <p>{incident.rootCauseAnalysis.suggestedFix}</p>
              <h3 className="it-section-title">Estimated recovery</h3>
              <p>{incident.rootCauseAnalysis.estimatedRecoveryMinutes} minutes</p>
            </div>
          ) : (
            <p className="it-page-description">No AI analysis has been run for this incident yet.</p>
          )}
          <div className="it-form-actions">
            <Button onClick={runAnalysis} isLoading={isAnalyzing}>
              {incident.rootCauseAnalysis ? "Re-run analysis" : "Run AI Root Cause Copilot"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
