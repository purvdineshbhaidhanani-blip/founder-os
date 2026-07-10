"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Modal, Button, Input, Select, Textarea, Badge, useToast } from "@founder-os/ui/primitives";

interface LogEventRow {
  id: string;
  source: string;
  eventType: string;
  severity: string;
  sourceIp: string | null;
  actorId: string | null;
  occurredAt: string;
}

const SEVERITY_BADGE: Record<string, "default" | "info" | "warning" | "destructive"> = {
  info: "default",
  low: "default",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

export default function LogEventsPage() {
  const { show } = useToast();
  const [events, setEvents] = useState<LogEventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/log-events");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setEvents(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load log events.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    let payload: Record<string, unknown> | undefined;
    const payloadText = String(formData.get("payload") ?? "").trim();
    if (payloadText) {
      try {
        payload = JSON.parse(payloadText);
      } catch {
        show({ title: "Invalid payload", description: "Payload must be valid JSON.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const response = await fetch("/api/log-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: formData.get("source"),
          eventType: formData.get("eventType"),
          severity: formData.get("severity"),
          sourceIp: formData.get("sourceIp") || undefined,
          actorId: formData.get("actorId") || undefined,
          payload,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't ingest event", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Log event ingested", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<LogEventRow>[] = [
    { key: "occurredAt", header: "Time", sortable: true, render: (row) => new Date(row.occurredAt).toLocaleString() },
    { key: "source", header: "Source", render: (row) => row.source },
    { key: "eventType", header: "Event type", render: (row) => row.eventType },
    { key: "severity", header: "Severity", render: (row) => <Badge variant={SEVERITY_BADGE[row.severity] ?? "default"}>{row.severity}</Badge> },
    { key: "sourceIp", header: "Source IP", render: (row) => row.sourceIp ?? "—" },
    { key: "actorId", header: "Actor", render: (row) => row.actorId ?? "—" },
  ];

  return (
    <div>
      <div className="sc-page-header">
        <div>
          <h1 className="sc-page-title">Log events</h1>
          <p className="sc-page-description">Ingested signals from firewalls, EDR, IAM, apps, and DNS.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Ingest event</Button>
      </div>

      <DataTable
        columns={columns}
        rows={events}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No log events yet"
        emptyDescription="Ingest your first event to start building correlation history."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ingest a log event" description="Record a signal from a security data source.">
        <form className="sc-auth-form" onSubmit={handleCreate}>
          <div className="sc-form-grid">
            <Select
              name="source"
              label="Source"
              defaultValue="firewall"
              options={[
                { value: "firewall", label: "Firewall" },
                { value: "edr", label: "EDR" },
                { value: "iam", label: "IAM" },
                { value: "app", label: "App" },
                { value: "dns", label: "DNS" },
              ]}
            />
            <Select
              name="severity"
              label="Severity"
              defaultValue="info"
              options={[
                { value: "info", label: "Info" },
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "critical", label: "Critical" },
              ]}
            />
          </div>
          <Input name="eventType" label="Event type" required placeholder="e.g. login_failed, firewall_block" />
          <div className="sc-form-grid">
            <Input name="sourceIp" label="Source IP (optional)" placeholder="10.0.0.1" />
            <Input name="actorId" label="Actor (optional)" placeholder="user@company.com" />
          </div>
          <Textarea name="payload" label="Raw payload (optional JSON)" rows={4} placeholder='{"key": "value"}' />
          <div className="sc-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Ingest event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
