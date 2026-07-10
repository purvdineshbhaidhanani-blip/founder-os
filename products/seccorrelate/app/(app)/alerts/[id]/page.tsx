"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Select, Skeleton, ErrorState, useToast } from "@founder-os/ui/primitives";

interface LogEvent {
  id: string;
  source: string;
  eventType: string;
  severity: string;
  sourceIp: string | null;
  actorId: string | null;
  occurredAt: string;
  payload: unknown;
}

interface IncidentSummary {
  summary: string;
  rootCause: string;
  recommendedActions: string[];
  mitreTechniqueIds: string[];
}

interface AlertDetail {
  id: string;
  title: string;
  severity: string;
  status: string;
  correlationKey: string | null;
  detectedAt: string;
  firstLogEvent: LogEvent;
  secondLogEvent: LogEvent;
  incidentSummary: IncidentSummary | null;
}

function EventCard({ label, event }: { label: string; event: LogEvent }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>
          {event.source} · {event.eventType}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="sc-category-list">
          <li>Occurred: {new Date(event.occurredAt).toLocaleString()}</li>
          <li>Severity: {event.severity}</li>
          <li>Source IP: {event.sourceIp ?? "—"}</li>
          <li>Actor: {event.actorId ?? "—"}</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export default function AlertDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/alerts/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setAlert(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alert.");
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
      const response = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't update status", description: body.error?.message, variant: "destructive" });
        return;
      }
      setAlert(body.data);
      show({ title: "Alert status updated", variant: "success" });
    } finally {
      setIsUpdating(false);
    }
  }

  async function investigate() {
    setIsSummarizing(true);
    try {
      const response = await fetch(`/api/alerts/${id}/summarize`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI investigation unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Incident summary ready", variant: "success" });
      load();
    } finally {
      setIsSummarizing(false);
    }
  }

  if (isLoading) return <Skeleton style={{ height: 300 }} />;
  if (error || !alert) return <ErrorState description={error ?? "Alert not found."} onRetry={load} />;

  return (
    <div>
      <div className="sc-page-header">
        <div>
          <h1 className="sc-page-title">{alert.title}</h1>
          <p className="sc-page-description">
            Detected {new Date(alert.detectedAt).toLocaleString()} · Correlation key: {alert.correlationKey ?? "—"}
          </p>
        </div>
        <div className="sc-form-actions">
          <Badge variant="warning">{alert.severity}</Badge>
          <Select
            name="status"
            label="Status"
            hideLabel
            value={alert.status}
            onChange={(event) => updateStatus(event.target.value)}
            disabled={isUpdating}
            options={[
              { value: "open", label: "Open" },
              { value: "investigating", label: "Investigating" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" },
            ]}
          />
        </div>
      </div>

      <div className="sc-form-grid">
        <EventCard label="First event" event={alert.firstLogEvent} />
        <EventCard label="Second event" event={alert.secondLogEvent} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI incident investigation</CardTitle>
          <CardDescription>Summary, root cause, recommended actions, and MITRE ATT&amp;CK mapping.</CardDescription>
        </CardHeader>
        <CardContent>
          {alert.incidentSummary ? (
            <div>
              <p>{alert.incidentSummary.summary}</p>
              <h3 className="sc-section-title">Root cause</h3>
              <p>{alert.incidentSummary.rootCause}</p>
              <h3 className="sc-section-title">Recommended actions</h3>
              <ul className="sc-category-list">
                {alert.incidentSummary.recommendedActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              {alert.incidentSummary.mitreTechniqueIds.length > 0 && (
                <>
                  <h3 className="sc-section-title">MITRE ATT&amp;CK techniques</h3>
                  <div className="sc-form-actions">
                    {alert.incidentSummary.mitreTechniqueIds.map((techniqueId) => (
                      <Badge key={techniqueId}>{techniqueId}</Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="sc-page-description">No AI investigation has been run for this alert yet.</p>
          )}
          <div className="sc-form-actions">
            <Button onClick={investigate} isLoading={isSummarizing}>
              {alert.incidentSummary ? "Re-run AI investigation" : "AI Investigate"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
