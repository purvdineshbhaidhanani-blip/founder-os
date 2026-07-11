"use client";

import { useEffect, useState } from "react";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Badge } from "@founder-os/ui/primitives";

interface GenerationRow {
  id: string;
  poseDescription: string;
  consistencyScore: number;
  driftWarnings: string[];
  createdAt: string;
  character: { name: string };
}

export default function GenerationsPage() {
  const [generations, setGenerations] = useState<GenerationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generations");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setGenerations(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load generations.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const columns: DataTableColumn<GenerationRow>[] = [
    { key: "character", header: "Character", render: (row) => row.character.name },
    { key: "pose", header: "Pose", render: (row) => row.poseDescription },
    {
      key: "score",
      header: "Consistency",
      sortable: true,
      render: (row) => <Badge variant={row.consistencyScore >= 90 ? "success" : row.consistencyScore >= 60 ? "warning" : "destructive"}>{row.consistencyScore}</Badge>,
    },
    { key: "createdAt", header: "Created", sortable: true, render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Generations</h1>
          <p className="cc-page-description">Every prompt assembled, with its consistency score.</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={generations}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No generations yet"
        emptyDescription="Open a character and assemble your first prompt."
      />
    </div>
  );
}
