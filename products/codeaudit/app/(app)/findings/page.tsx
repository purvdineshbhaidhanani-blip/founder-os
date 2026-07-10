"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Badge, Select } from "@founder-os/ui/primitives";

interface FindingRow {
  id: string;
  filePath: string;
  line: number;
  category: string;
  severity: string;
  status: string;
  title: string;
  createdAt: string;
}

const SEVERITY_BADGE: Record<string, "default" | "info" | "warning" | "destructive"> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

const STATUS_BADGE: Record<string, "default" | "warning" | "success" | "secondary"> = {
  open: "warning",
  fixed: "success",
  false_positive: "secondary",
  wont_fix: "default",
};

export default function FindingsPage() {
  const [findings, setFindings] = useState<FindingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (severity) params.set("severity", severity);
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
  }, [status, severity]);

  const columns: DataTableColumn<FindingRow>[] = [
    { key: "title", header: "Finding", render: (row) => <Link href={`/findings/${row.id}`}>{row.title}</Link> },
    { key: "filePath", header: "Location", render: (row) => `${row.filePath}:${row.line}` },
    { key: "category", header: "Category", render: (row) => row.category },
    { key: "severity", header: "Severity", render: (row) => <Badge variant={SEVERITY_BADGE[row.severity] ?? "default"}>{row.severity}</Badge> },
    { key: "status", header: "Status", render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? "default"}>{row.status.replace("_", " ")}</Badge> },
  ];

  return (
    <div>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Findings</h1>
          <p className="ca-page-description">Every issue detected across all scans.</p>
        </div>
        <div className="ca-form-actions">
          <Select
            name="severity"
            label="Severity"
            hideLabel
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            options={[
              { value: "", label: "All severities" },
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <Select
            name="status"
            label="Status"
            hideLabel
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              { value: "", label: "All statuses" },
              { value: "open", label: "Open" },
              { value: "fixed", label: "Fixed" },
              { value: "false_positive", label: "False positive" },
              { value: "wont_fix", label: "Won't fix" },
            ]}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={findings}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No findings"
        emptyDescription="Run a scan on a repository to surface findings here."
      />
    </div>
  );
}
