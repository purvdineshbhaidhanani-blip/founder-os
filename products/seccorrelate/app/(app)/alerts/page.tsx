"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Badge, Select } from "@founder-os/ui/primitives";

interface AlertRow {
  id: string;
  title: string;
  severity: string;
  status: string;
  detectedAt: string;
}

const SEVERITY_BADGE: Record<string, "default" | "info" | "warning" | "destructive"> = {
  info: "default",
  low: "default",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

const STATUS_BADGE: Record<string, "default" | "info" | "warning" | "success"> = {
  open: "warning",
  investigating: "info",
  resolved: "success",
  dismissed: "default",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/alerts${status ? `?status=${status}` : ""}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setAlerts(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const columns: DataTableColumn<AlertRow>[] = [
    {
      key: "title",
      header: "Alert",
      render: (row) => <Link href={`/alerts/${row.id}`}>{row.title}</Link>,
    },
    { key: "severity", header: "Severity", render: (row) => <Badge variant={SEVERITY_BADGE[row.severity] ?? "default"}>{row.severity}</Badge> },
    { key: "status", header: "Status", render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? "default"}>{row.status}</Badge> },
    { key: "detectedAt", header: "Detected", sortable: true, render: (row) => new Date(row.detectedAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="sc-page-header">
        <div>
          <h1 className="sc-page-title">Alerts</h1>
          <p className="sc-page-description">Correlated threats, ranked by detection time.</p>
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
            { value: "dismissed", label: "Dismissed" },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={alerts}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No alerts"
        emptyDescription="Ingest log events and run your correlation rules to generate alerts."
      />
    </div>
  );
}
