"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Select, Skeleton, ErrorState, useToast } from "@founder-os/ui/primitives";

interface FollowUpSuggestion {
  summary: string;
  nextStepSuggestion: string;
  draftEmail: string;
  opportunityDetected: boolean;
}

interface LeadDetail {
  id: string;
  status: string;
  score: number;
  source: string;
  notes: string | null;
  contact: { firstName: string; lastName: string | null; email: string | null; phone: string | null; company: string | null; jobTitle: string | null };
  followUpSuggestion: FollowUpSuggestion | null;
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssisting, setIsAssisting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/leads/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setLead(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(status: string) {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't update status", description: body.error?.message, variant: "destructive" });
        return;
      }
      setLead(body.data);
      show({ title: "Lead status updated", variant: "success" });
    } finally {
      setIsUpdating(false);
    }
  }

  async function runAssistant() {
    setIsAssisting(true);
    try {
      const response = await fetch(`/api/leads/${id}/assist`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Sales Assistant unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Follow-up suggestion ready", variant: "success" });
      load();
    } finally {
      setIsAssisting(false);
    }
  }

  if (isLoading) return <Skeleton style={{ height: 300 }} />;
  if (error || !lead) return <ErrorState description={error ?? "Lead not found."} onRetry={load} />;

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">
            {lead.contact.firstName} {lead.contact.lastName ?? ""}
          </h1>
          <p className="cc-page-description">
            {lead.contact.jobTitle ?? "—"} at {lead.contact.company ?? "—"}
          </p>
        </div>
        <div className="cc-form-actions">
          <Badge variant="info">Score: {lead.score}</Badge>
          <Select
            name="status"
            label="Status"
            hideLabel
            value={lead.status}
            onChange={(event) => updateStatus(event.target.value)}
            disabled={isUpdating}
            options={[
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "converted", label: "Converted" },
              { value: "lost", label: "Lost" },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="cc-category-list">
            <li>Email: {lead.contact.email ?? "—"}</li>
            <li>Phone: {lead.contact.phone ?? "—"}</li>
            <li>Source: {lead.source}</li>
            {lead.notes && <li>Notes: {lead.notes}</li>}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Sales Assistant</CardTitle>
          <CardDescription>Summary, next step, and a ready-to-send follow-up email.</CardDescription>
        </CardHeader>
        <CardContent>
          {lead.followUpSuggestion ? (
            <div>
              <p>{lead.followUpSuggestion.summary}</p>
              <h3 className="cc-section-title">Next step</h3>
              <p>{lead.followUpSuggestion.nextStepSuggestion}</p>
              <h3 className="cc-section-title">Draft follow-up email</h3>
              <pre className="cc-code-snippet">{lead.followUpSuggestion.draftEmail}</pre>
              {lead.followUpSuggestion.opportunityDetected && <Badge variant="success">Opportunity detected</Badge>}
            </div>
          ) : (
            <p className="cc-page-description">No AI suggestion has been generated for this lead yet.</p>
          )}
          <div className="cc-form-actions">
            <Button onClick={runAssistant} isLoading={isAssisting}>
              {lead.followUpSuggestion ? "Regenerate suggestion" : "Run AI Sales Assistant"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
