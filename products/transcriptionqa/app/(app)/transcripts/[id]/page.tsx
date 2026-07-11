"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge, useToast } from "@founder-os/ui/primitives";

interface FindingRow {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  suggestedCorrection: string | null;
  status: string;
  segment: { speakerLabel: string };
}

interface SegmentRow {
  id: string;
  speakerLabel: string;
  text: string;
}

interface TranscriptDetail {
  id: string;
  title: string;
  sourceLabel: string;
  accuracyScore: number;
  summary: string | null;
  copilotRiskLevel: string | null;
  copilotHighlightedRisks: string[];
  segments: SegmentRow[];
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

export default function TranscriptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [transcript, setTranscript] = useState<TranscriptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCopilot, setIsRunningCopilot] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transcripts/${id}`);
      const body = await response.json();
      if (response.ok) setTranscript(body.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runCopilot() {
    setIsRunningCopilot(true);
    try {
      const response = await fetch(`/api/transcripts/${id}/copilot`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Accuracy Copilot unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Copilot brief ready", variant: "success" });
      load();
    } finally {
      setIsRunningCopilot(false);
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

  if (isLoading || !transcript) return <p className="tq-page-description">Loading…</p>;

  return (
    <div>
      <div className="tq-page-header">
        <div>
          <h1 className="tq-page-title">{transcript.title}</h1>
          <p className="tq-page-description">Source: {transcript.sourceLabel}</p>
        </div>
        <Badge variant={scoreVariant(transcript.accuracyScore)}>Accuracy score {transcript.accuracyScore}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Accuracy Copilot</CardTitle>
          <CardDescription>Summarizes this transcript and highlights the sections that need the closest review.</CardDescription>
        </CardHeader>
        <CardContent>
          {transcript.summary ? (
            <div className="tq-copilot-action">
              <div className="tq-copilot-action-header">
                <strong>Risk level: {transcript.copilotRiskLevel}</strong>
              </div>
              <p>{transcript.summary}</p>
              {transcript.copilotHighlightedRisks.length > 0 && (
                <ul className="tq-category-list">
                  {transcript.copilotHighlightedRisks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="tq-page-description">No Copilot brief generated yet.</p>
          )}
          <div className="tq-form-actions">
            <Button onClick={runCopilot} isLoading={isRunningCopilot}>
              {transcript.summary ? "Regenerate brief" : "Generate Copilot brief"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings ({transcript.findings.length})</CardTitle>
          <CardDescription>Terminology and speaker-attribution issues flagged by the QA engine.</CardDescription>
        </CardHeader>
        <CardContent>
          {transcript.findings.length === 0 ? (
            <p className="tq-page-description">No findings — this transcript reviewed cleanly.</p>
          ) : (
            transcript.findings.map((finding) => (
              <div key={finding.id} className="tq-copilot-action">
                <div className="tq-copilot-action-header">
                  <strong>
                    {finding.segment.speakerLabel} — {finding.title}
                  </strong>
                  <Badge variant={severityVariant(finding.severity)}>{finding.severity}</Badge>
                </div>
                <p>{finding.description}</p>
                <div className="tq-form-actions">
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
          <CardTitle>Transcript</CardTitle>
          <CardDescription>Every segment, in order.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="tq-code-snippet">
            {transcript.segments.map((segment) => (
              <p key={segment.id}>
                <strong>{segment.speakerLabel}:</strong> {segment.text}
              </p>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <a href={`/api/transcripts/${transcript.id}/export`} className="fos-btn fos-btn-primary fos-btn-sm" download>
            Export as text
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
