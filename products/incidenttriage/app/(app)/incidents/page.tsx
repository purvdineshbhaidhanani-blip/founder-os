"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Badge, Select } from "@founder-os/ui/primitives";

interface IncidentRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  startedAt: string;
  service: { name: string };
}

const SEVERITY_BADGE: Record<string, "default" | "warning" | "destructive"> = {
  info: "default",
  warning: "warning",
  critical: "destructive",
};

const STATUS_BADGE: Record<string, "warning" | "info" | "success"> = {
  open: "warning",
  investigating: "info",
  resolved: "success",
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/incidents${status ? `?status=${status}` : ""}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setIncidents(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incidents.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const columns: DataTableColumn<IncidentRow>[] = [
    { key: "title", header: "Incident", render: (row) => <Link href={`/incidents/${row.id}`}>{row.title}</Link> },
    { key: "service", header: "Service", render: (row) => row.service.name },
    { key: "severity", header: "Severity", render: (row) => <Badge variant={SEVERITY_BADGE[row.severity] ?? "default"}>{row.severity}</Badge> },
    { key: "status", header: "Status", render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? "default"}>{row.status}</Badge> },
    { key: "startedAt", header: "Started", sortable: true, render: (row) => new Date(row.startedAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="it-page-header">
        <div>
          <h1 className="it-page-title">Incidents</h1>
          <p className="it-page-description">Correlated alerts, grouped by service and time window.</p>
        </div>
        <Select
          name="status"
          label="Status"
          hideLabel
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[
            { value: "", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "investigating", label: "Investigating" },
            { value: "resolved", label: "Resolved" },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={incidents}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No incidents"
        emptyDescription="Ingest alerts to see correlated incidents here."
      />
    </div>
  );
}
