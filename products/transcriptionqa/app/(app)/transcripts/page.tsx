"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Textarea, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface TranscriptRow {
  id: string;
  title: string;
  sourceLabel: string;
  accuracyScore: number;
  createdAt: string;
}

interface SegmentDraft {
  speakerLabel: string;
  text: string;
}

const EMPTY_SEGMENT: SegmentDraft = { speakerLabel: "Speaker 1", text: "" };

function scoreVariant(score: number): "success" | "warning" | "destructive" {
  if (score >= 90) return "success";
  if (score >= 60) return "warning";
  return "destructive";
}

export default function TranscriptsPage() {
  const { show } = useToast();
  const [transcripts, setTranscripts] = useState<TranscriptRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [segments, setSegments] = useState<SegmentDraft[]>([{ ...EMPTY_SEGMENT }]);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/transcripts");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setTranscripts(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load transcripts.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateSegment(index: number, field: keyof SegmentDraft, value: string) {
    setSegments((current) => current.map((segment, i) => (i === index ? { ...segment, [field]: value } : segment)));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          sourceLabel: formData.get("sourceLabel"),
          estimatedMinutes: Number(formData.get("estimatedMinutes")),
          segments: segments.filter((s) => s.text.trim()),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't review transcript", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Transcript reviewed", description: `Accuracy score: ${body.data.accuracyScore}`, variant: "success" });
      setIsModalOpen(false);
      setSegments([{ ...EMPTY_SEGMENT }]);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<TranscriptRow>[] = [
    { key: "title", header: "Title", sortable: true, render: (row) => <Link href={`/transcripts/${row.id}`}>{row.title}</Link> },
    { key: "sourceLabel", header: "Source", render: (row) => row.sourceLabel },
    { key: "score", header: "Accuracy score", sortable: true, render: (row) => <Badge variant={scoreVariant(row.accuracyScore)}>{row.accuracyScore}</Badge> },
    { key: "createdAt", header: "Reviewed", sortable: true, render: (row) => new Date(row.createdAt).toLocaleString() },
  ];

  return (
    <div>
      <div className="tq-page-header">
        <div>
          <h1 className="tq-page-title">Transcripts</h1>
          <p className="tq-page-description">Paste a transcript and its speaker-labeled segments to review it.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New transcript</Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : transcripts.length === 0 ? (
        <EmptyState title="No transcripts yet" description="Review your first transcript to see its accuracy score and findings." />
      ) : (
        <DataTable columns={columns} rows={transcripts} getRowId={(row) => row.id} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New transcript" description="Paste the transcript's segments as produced by any transcription source.">
        <form className="tq-auth-form" onSubmit={handleCreate}>
          <div className="tq-form-grid">
            <Input name="title" label="Title" required placeholder="Deposition of J. Alvarez" />
            <Input name="sourceLabel" label="Source" required placeholder="Zoom recording, in-house ASR" />
          </div>
          <Input name="estimatedMinutes" type="number" step="0.5" min="0" label="Estimated audio minutes" required placeholder="42" />

          {segments.map((segment, index) => (
            <div key={index} className="tq-copilot-action">
              <div className="tq-copilot-action-header">
                <strong>Segment {index + 1}</strong>
                {segments.length > 1 && (
                  <Button type="button" variant="outline" onClick={() => setSegments((current) => current.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="tq-form-grid">
                <Select
                  label="Speaker"
                  value={segment.speakerLabel}
                  onChange={(e) => updateSegment(index, "speakerLabel", e.target.value)}
                  options={[
                    { value: "Speaker 1", label: "Speaker 1" },
                    { value: "Speaker 2", label: "Speaker 2" },
                    { value: "Speaker 3", label: "Speaker 3" },
                  ]}
                  required
                />
              </div>
              <Textarea rows={2} label="Text" value={segment.text} onChange={(e) => updateSegment(index, "text", e.target.value)} required placeholder="What the speaker said in this segment." />
            </div>
          ))}

          <Button type="button" variant="outline" onClick={() => setSegments((current) => [...current, { ...EMPTY_SEGMENT }])}>
            Add another segment
          </Button>

          <div className="tq-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Review transcript
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
