"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Badge, Select, useToast } from "@founder-os/ui/primitives";

interface FindingRow {
  id: string;
  category: "sod_violation" | "config_error" | "process_deviation";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "resolved" | "accepted_risk";
  title: string;
  description: string;
  scan: { instance: { name: string } };
}

const SEVERITY_BADGE: Record<string, "default" | "warning" | "destructive"> = {
  low: "default",
  medium: "default",
  high: "warning",
  critical: "destructive",
};

export default function FindingsPage() {
  const { show } = useToast();
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      if (category) params.set("category", category);
      const response = await fetch(`/api/findings?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setFindings(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load findings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function updateStatus(findingId: string, status: string) {
    const response = await fetch(`/api/findings/${findingId}`, {
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

  const columns: DataTableColumn<FindingRow>[] = [
    { key: "title", header: "Finding", render: (row) => <Link href={`/findings/${row.id}`}>{row.title}</Link> },
    { key: "instance", header: "Instance", render: (row) => row.scan.instance.name },
    { key: "category", header: "Category", render: (row) => row.category.replace("_", " ") },
    { key: "severity", header: "Severity", render: (row) => <Badge variant={SEVERITY_BADGE[row.severity] ?? "default"}>{row.severity}</Badge> },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Select
          name={`status-${row.id}`}
          label="Status"
          hideLabel
          value={row.status}
          onChange={(event) => updateStatus(row.id, event.target.value)}
          options={[
            { value: "open", label: "Open" },
            { value: "resolved", label: "Resolved" },
            { value: "accepted_risk", label: "Accepted risk" },
          ]}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="ea-page-header">
        <div>
          <h1 className="ea-page-title">Findings</h1>
          <p className="ea-page-description">Every SoD violation, configuration error, and process deviation.</p>
        </div>
        <Select
          name="category"
          label="Category"
          hideLabel
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          options={[
            { value: "", label: "All categories" },
            { value: "sod_violation", label: "SoD violations" },
            { value: "config_error", label: "Config errors" },
            { value: "process_deviation", label: "Process deviations" },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={findings}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No findings"
        emptyDescription="Run a scan on an ERP instance to surface findings here."
      />
    </div>
  );
}
