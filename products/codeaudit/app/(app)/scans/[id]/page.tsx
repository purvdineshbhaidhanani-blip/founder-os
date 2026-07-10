"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Skeleton, ErrorState } from "@founder-os/ui/primitives";

interface Finding {
  id: string;
  filePath: string;
  line: number;
  category: string;
  severity: string;
  title: string;
  status: string;
}

interface ScanDetail {
  id: string;
  status: string;
  filesScanned: number;
  healthScore: number | null;
  startedAt: string;
  repository: { name: string; defaultBranch: string };
  findings: Finding[];
}

const SEVERITY_BADGE: Record<string, "default" | "info" | "warning" | "destructive"> = {
  low: "default",
  medium: "info",
  high: "warning",
  critical: "destructive",
};

export default function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [scan, setScan] = useState<ScanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/scans/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setScan(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scan.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (isLoading) return <Skeleton style={{ height: 300 }} />;
  if (error || !scan) return <ErrorState description={error ?? "Scan not found."} onRetry={load} />;

  return (
    <div>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">{scan.repository.name}</h1>
          <p className="ca-page-description">
            Scanned {scan.filesScanned} file(s) on {new Date(scan.startedAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={scan.healthScore !== null && scan.healthScore >= 80 ? "success" : scan.healthScore !== null && scan.healthScore >= 50 ? "warning" : "destructive"}>
          Health score: {scan.healthScore ?? "—"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings ({scan.findings.length})</CardTitle>
          <CardDescription>Every issue detected in this scan.</CardDescription>
        </CardHeader>
        <CardContent>
          {scan.findings.length === 0 ? (
            <p className="ca-page-description">No issues found — clean scan.</p>
          ) : (
            scan.findings.map((finding) => (
              <div key={finding.id} className="ca-copilot-action">
                <div className="ca-copilot-action-header">
                  <Link href={`/findings/${finding.id}`}>
                    <strong>{finding.title}</strong>
                  </Link>
                  <Badge variant={SEVERITY_BADGE[finding.severity] ?? "default"}>{finding.severity}</Badge>
                </div>
                <p>
                  {finding.filePath}:{finding.line} · {finding.category} · {finding.status}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
