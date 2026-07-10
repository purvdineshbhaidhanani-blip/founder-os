"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Modal, Button, Input, Select, Textarea, Badge, useToast } from "@founder-os/ui/primitives";

interface RepositoryOption {
  id: string;
  name: string;
}

interface ScanRow {
  id: string;
  status: string;
  filesScanned: number;
  healthScore: number | null;
  startedAt: string;
  repository: { id: string; name: string };
}

export default function ScansPage() {
  const { show } = useToast();
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [scansRes, reposRes] = await Promise.all([fetch("/api/scans"), fetch("/api/repositories")]);
      const scansBody = await scansRes.json();
      const reposBody = await reposRes.json();
      if (!scansRes.ok) throw new Error(scansBody.error?.message);
      setScans(scansBody.data.data);
      if (reposRes.ok) setRepositories(reposBody.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scans.");
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
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repositoryId: formData.get("repositoryId"),
          files: [{ path: formData.get("filePath"), content: formData.get("fileContent") }],
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't run scan", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: `Scan complete — health score ${body.data.healthScore}`, variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<ScanRow>[] = [
    { key: "repository", header: "Repository", render: (row) => <Link href={`/scans/${row.id}`}>{row.repository.name}</Link> },
    { key: "status", header: "Status", render: (row) => <Badge variant={row.status === "completed" ? "success" : row.status === "failed" ? "destructive" : "info"}>{row.status}</Badge> },
    { key: "filesScanned", header: "Files", render: (row) => String(row.filesScanned) },
    { key: "healthScore", header: "Health score", render: (row) => (row.healthScore === null ? "—" : String(row.healthScore)) },
    { key: "startedAt", header: "Started", sortable: true, render: (row) => new Date(row.startedAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Scans</h1>
          <p className="ca-page-description">Every scan run against your tracked repositories.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} disabled={repositories.length === 0}>
          New scan
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={scans}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No scans yet"
        emptyDescription="Add a repository, then run your first scan to see findings here."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Run a scan" description="Paste a file's code to scan it for vulnerabilities, secrets, and quality issues.">
        <form className="ca-auth-form" onSubmit={handleCreate}>
          <Select
            name="repositoryId"
            label="Repository"
            options={repositories.map((repo) => ({ value: repo.id, label: repo.name }))}
            placeholder="Select a repository"
            required
          />
          <Input name="filePath" label="File path" required placeholder="src/db.js" />
          <Textarea name="fileContent" label="File content" rows={10} required placeholder="Paste the file's source code" />
          <div className="ca-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Run scan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
