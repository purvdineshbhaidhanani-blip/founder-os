"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Select, Textarea, Badge, useToast } from "@founder-os/ui/primitives";

interface SchemaRow {
  id: string;
  name: string;
  engine: string;
  healthScore: number;
  createdAt: string;
}

const EXAMPLE_TABLES_JSON = JSON.stringify(
  [
    {
      name: "customers",
      hasPrimaryKey: true,
      columns: [{ name: "id", dataType: "uuid", isNullable: false }, { name: "email", dataType: "text", isNullable: false }],
      indexes: [{ name: "idx_customers_email", columnNames: ["email"], isUnique: true }],
    },
    {
      name: "orders",
      hasPrimaryKey: true,
      columns: [
        { name: "id", dataType: "uuid", isNullable: false },
        { name: "customer_id", dataType: "uuid", isNullable: false, referencesTable: "customers", referencesColumn: "id" },
        { name: "totalCents", dataType: "integer", isNullable: false },
      ],
      indexes: [],
    },
  ],
  null,
  2,
);

function scoreVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 90) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

export default function SchemasPage() {
  const { show } = useToast();
  const [schemas, setSchemas] = useState<SchemaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tablesJson, setTablesJson] = useState("");

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/schemas");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setSchemas(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schemas.");
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

    let tables: unknown;
    try {
      tables = JSON.parse(tablesJson);
    } catch {
      show({ title: "Invalid tables JSON", description: "Couldn't parse the tables field as JSON.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/schemas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name"), engine: formData.get("engine"), tables }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't scan schema", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Schema scanned", description: `Health score: ${body.data.healthScore}`, variant: "success" });
      setIsModalOpen(false);
      setTablesJson("");
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<SchemaRow>[] = [
    { key: "name", header: "Name", sortable: true, render: (row) => <Link href={`/schemas/${row.id}`}>{row.name}</Link> },
    { key: "engine", header: "Engine", render: (row) => row.engine },
    { key: "score", header: "Health score", sortable: true, render: (row) => <Badge variant={scoreVariant(row.healthScore)}>{row.healthScore}</Badge> },
    { key: "createdAt", header: "Scanned", sortable: true, render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Schemas</h1>
          <p className="sl-page-description">Import a schema snapshot (tables, columns, foreign keys, indexes) to scan it.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New schema</Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : schemas.length === 0 ? (
        <EmptyState title="No schemas yet" description="Import your first schema to see its health score and findings." />
      ) : (
        <DataTable columns={columns} rows={schemas} getRowId={(row) => row.id} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New schema" description="Paste a tables JSON array as introspected/exported from your database.">
        <form className="sl-auth-form" onSubmit={handleCreate}>
          <div className="sl-form-grid">
            <Input name="name" label="Schema name" required placeholder="production" />
            <Select
              name="engine"
              label="Engine"
              defaultValue="postgresql"
              options={[
                { value: "postgresql", label: "PostgreSQL" },
                { value: "mysql", label: "MySQL" },
                { value: "sqlite", label: "SQLite" },
                { value: "sqlserver", label: "SQL Server" },
              ]}
              required
            />
          </div>
          <div className="sl-form-actions">
            <Button type="button" variant="outline" onClick={() => setTablesJson(EXAMPLE_TABLES_JSON)}>
              Load example
            </Button>
          </div>
          <Textarea
            label="Tables (JSON)"
            rows={12}
            value={tablesJson}
            onChange={(e) => setTablesJson(e.target.value)}
            required
            placeholder={EXAMPLE_TABLES_JSON}
          />
          <div className="sl-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Scan schema
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
