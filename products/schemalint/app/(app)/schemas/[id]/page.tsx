"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, useToast } from "@founder-os/ui/primitives";

interface FindingRow {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  table: { name: string };
}

interface TableRow {
  id: string;
  name: string;
  hasPrimaryKey: boolean;
  columns: { id: string; name: string; dataType: string; referencesTable: string | null }[];
  indexes: { id: string; name: string; columnNames: string[] }[];
}

interface SchemaDetail {
  id: string;
  name: string;
  engine: string;
  healthScore: number;
  summary: string | null;
  copilotRiskLevel: string | null;
  copilotRecommendations: string[];
  tables: TableRow[];
  findings: FindingRow[];
}

function scoreVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 90) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

function severityVariant(severity: string): "destructive" | "warning" | "info" | "default" {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "medium") return "warning";
  return "info";
}

export default function SchemaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [schema, setSchema] = useState<SchemaDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningArchitect, setIsRunningArchitect] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/schemas/${id}`);
      const body = await response.json();
      if (response.ok) setSchema(body.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runArchitect() {
    setIsRunningArchitect(true);
    try {
      const response = await fetch(`/api/schemas/${id}/architect`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Database Architect unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Architect brief ready", variant: "success" });
      load();
    } finally {
      setIsRunningArchitect(false);
    }
  }

  async function resolveFinding(findingId: string) {
    setResolvingId(findingId);
    try {
      const response = await fetch(`/api/findings/${findingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't resolve finding", description: body.error?.message, variant: "destructive" });
        return;
      }
      load();
    } finally {
      setResolvingId(null);
    }
  }

  if (isLoading || !schema) return <p className="sl-page-description">Loading…</p>;

  return (
    <div>
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">{schema.name}</h1>
          <p className="sl-page-description">Engine: {schema.engine}</p>
        </div>
        <Badge variant={scoreVariant(schema.healthScore)}>Health score {schema.healthScore}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Database Architect</CardTitle>
          <CardDescription>Summarizes this schema&rsquo;s health and recommends prioritized, specific fixes.</CardDescription>
        </CardHeader>
        <CardContent>
          {schema.summary ? (
            <div className="sl-copilot-action">
              <div className="sl-copilot-action-header">
                <strong>Risk level: {schema.copilotRiskLevel}</strong>
              </div>
              <p>{schema.summary}</p>
              {schema.copilotRecommendations.length > 0 && (
                <ul className="sl-category-list">
                  {schema.copilotRecommendations.map((rec) => (
                    <li key={rec}>{rec}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="sl-page-description">No Architect brief generated yet.</p>
          )}
          <div className="sl-form-actions">
            <Button onClick={runArchitect} isLoading={isRunningArchitect}>
              {schema.summary ? "Regenerate brief" : "Generate Architect brief"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings ({schema.findings.length})</CardTitle>
          <CardDescription>Missing keys, missing FK indexes, naming violations, and duplicate indexes.</CardDescription>
        </CardHeader>
        <CardContent>
          {schema.findings.length === 0 ? (
            <p className="sl-page-description">No findings — this schema scanned cleanly.</p>
          ) : (
            schema.findings.map((finding) => (
              <div key={finding.id} className="sl-copilot-action">
                <div className="sl-copilot-action-header">
                  <strong>
                    {finding.table.name} — {finding.title}
                  </strong>
                  <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                </div>
                <p>{finding.description}</p>
                <div className="sl-form-actions">
                  {finding.status === "open" ? (
                    <Button variant="outline" onClick={() => resolveFinding(finding.id)} isLoading={resolvingId === finding.id}>
                      Mark resolved
                    </Button>
                  ) : (
                    <Badge variant="success">Resolved</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tables ({schema.tables.length})</CardTitle>
          <CardDescription>Every table, its columns, and its indexes.</CardDescription>
        </CardHeader>
        <CardContent>
          {schema.tables.map((table) => (
            <div key={table.id} className="sl-copilot-action">
              <div className="sl-copilot-action-header">
                <strong>{table.name}</strong>
                {!table.hasPrimaryKey && <Badge variant="destructive">No primary key</Badge>}
              </div>
              <p className="sl-page-description">
                Columns: {table.columns.map((c) => `${c.name}${c.referencesTable ? ` → ${c.referencesTable}` : ""}`).join(", ")}
              </p>
              <p className="sl-page-description">Indexes: {table.indexes.length > 0 ? table.indexes.map((i) => i.name).join(", ") : "none"}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
