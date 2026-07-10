"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Skeleton, ErrorState, useToast } from "@founder-os/ui/primitives";

interface HealthProfile {
  leadQuality: string;
  missingFields: string[];
  suggestedEnrichment: string[];
  confidenceScore: number;
  explanation: string;
}

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  emailStatus: string;
  phone: string | null;
  phoneStatus: string;
  company: string | null;
  jobTitle: string | null;
  healthScore: number;
  healthProfile: HealthProfile | null;
}

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contacts/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setContact(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runHealthEngine() {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/contacts/${id}/analyze`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Contact Health Engine unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Health profile ready", variant: "success" });
      load();
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) return <Skeleton style={{ height: 300 }} />;
  if (error || !contact) return <ErrorState description={error ?? "Contact not found."} onRetry={load} />;

  return (
    <div>
      <div className="cv-page-header">
        <div>
          <h1 className="cv-page-title">
            {contact.firstName} {contact.lastName ?? ""}
          </h1>
          <p className="cv-page-description">
            {contact.jobTitle ?? "—"} at {contact.company ?? "—"}
          </p>
        </div>
        <Badge variant="info">Health score: {contact.healthScore}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="cv-category-list">
            <li>
              Email: {contact.email ?? "—"} ({contact.emailStatus})
            </li>
            <li>
              Phone: {contact.phone ?? "—"} ({contact.phoneStatus})
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Contact Health Engine</CardTitle>
          <CardDescription>Lead quality, missing fields, suggested enrichment, and a confidence score.</CardDescription>
        </CardHeader>
        <CardContent>
          {contact.healthProfile ? (
            <div>
              <p>{contact.healthProfile.explanation}</p>
              <h3 className="cv-section-title">Lead quality</h3>
              <p>{contact.healthProfile.leadQuality}</p>
              {contact.healthProfile.missingFields.length > 0 && (
                <>
                  <h3 className="cv-section-title">Missing fields</h3>
                  <ul className="cv-category-list">
                    {contact.healthProfile.missingFields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </>
              )}
              {contact.healthProfile.suggestedEnrichment.length > 0 && (
                <>
                  <h3 className="cv-section-title">Suggested enrichment</h3>
                  <ul className="cv-category-list">
                    {contact.healthProfile.suggestedEnrichment.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <h3 className="cv-section-title">Confidence</h3>
              <p>{contact.healthProfile.confidenceScore}%</p>
            </div>
          ) : (
            <p className="cv-page-description">No AI health profile generated yet.</p>
          )}
          <div className="cv-form-actions">
            <Button onClick={runHealthEngine} isLoading={isAnalyzing}>
              {contact.healthProfile ? "Regenerate profile" : "Generate health profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
