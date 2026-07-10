"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Modal, Button, Input, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface ServiceOption {
  id: string;
  name: string;
}

interface AlertRow {
  id: string;
  source: string;
  message: string;
  severity: string;
  occurredAt: string;
  service: { name: string };
}

const SEVERITY_BADGE: Record<string, "default" | "warning" | "destructive"> = {
  info: "default",
  warning: "warning",
  critical: "destructive",
};

export default function AlertsPage() {
  const { show } = useToast();
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [alertsRes, servicesRes] = await Promise.all([fetch("/api/alerts"), fetch("/api/services")]);
      const alertsBody = await alertsRes.json();
      if (!alertsRes.ok) throw new Error(alertsBody.error?.message);
      setAlerts(alertsBody.data.data);
      if (servicesRes.ok) {
        const servicesBody = await servicesRes.json();
        setServices(servicesBody.data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
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

    try {
      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: formData.get("serviceId"),
          source: formData.get("source"),
          message: formData.get("message"),
          severity: formData.get("severity"),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't ingest alert", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Alert ingested", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<AlertRow>[] = [
    { key: "occurredAt", header: "Time", sortable: true, render: (row) => new Date(row.occurredAt).toLocaleString() },
    { key: "service", header: "Service", render: (row) => row.service.name },
    { key: "source", header: "Source", render: (row) => row.source },
    { key: "message", header: "Message", render: (row) => row.message },
    { key: "severity", header: "Severity", render: (row) => <Badge variant={SEVERITY_BADGE[row.severity] ?? "default"}>{row.severity}</Badge> },
  ];

  return (
    <div>
      <div className="it-page-header">
        <div>
          <h1 className="it-page-title">Alerts</h1>
          <p className="it-page-description">Ingested signals, automatically correlated into incidents.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={services.length === 0}>
          Ingest alert
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={alerts}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No alerts yet"
        emptyDescription="Add a service, then ingest your first alert."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ingest an alert" description="Simulates an alert from PagerDuty, Opsgenie, or a direct webhook.">
        <form className="it-auth-form" onSubmit={handleCreate}>
          <Select
            name="serviceId"
            label="Service"
            options={services.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Select a service"
            required
          />
          <div className="it-form-grid">
            <Input name="source" label="Source" required placeholder="datadog" />
            <Select
              name="severity"
              label="Severity"
              defaultValue="warning"
              options={[
                { value: "info", label: "Info" },
                { value: "warning", label: "Warning" },
                { value: "critical", label: "Critical" },
              ]}
            />
          </div>
          <Input name="message" label="Message" required placeholder="p99 latency above threshold" />
          <div className="it-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Ingest alert
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
