"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Badge, useToast } from "@founder-os/ui/primitives";

interface RuleRow {
  id: string;
  name: string;
  description: string | null;
  firstEventType: string;
  secondEventType: string;
  windowMinutes: number;
  severity: string;
  isActive: boolean;
}

export default function RulesPage() {
  const { show } = useToast();
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/rules");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setRules(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load correlation rules.");
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
      const response = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description") || undefined,
          firstEventType: formData.get("firstEventType"),
          secondEventType: formData.get("secondEventType"),
          windowMinutes: Number(formData.get("windowMinutes")),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't create rule", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Correlation rule created", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runRules() {
    setIsRunning(true);
    try {
      const response = await fetch("/api/rules/run", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't run correlation", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: `Correlation complete — ${body.data.length} new alert(s)`, variant: "success" });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div>
      <div className="sc-page-header">
        <div>
          <h1 className="sc-page-title">Correlation rules</h1>
          <p className="sc-page-description">No-code rules that connect related log events into alerts.</p>
        </div>
        <div className="sc-form-actions">
          <Button variant="outline" onClick={runRules} isLoading={isRunning}>
            Run correlation now
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>New rule</Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : rules.length === 0 ? (
        <EmptyState title="No correlation rules yet" description="Create a rule like: failed login + firewall block from the same IP within 5 minutes." />
      ) : (
        rules.map((rule) => (
          <div key={rule.id} className="sc-copilot-action">
            <div className="sc-copilot-action-header">
              <strong>{rule.name}</strong>
              <Badge variant={rule.isActive ? "success" : "secondary"}>{rule.isActive ? "active" : "inactive"}</Badge>
            </div>
            <p>
              {rule.firstEventType} → {rule.secondEventType} within {rule.windowMinutes} minutes (same source IP)
            </p>
            {rule.description && <p className="sc-page-description">{rule.description}</p>}
          </div>
        ))
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New correlation rule" description="Two event types, correlated by source IP within a time window.">
        <form className="sc-auth-form" onSubmit={handleCreate}>
          <Input name="name" label="Rule name" required placeholder="Potential brute force" />
          <div className="sc-form-grid">
            <Input name="firstEventType" label="First event type" required placeholder="login_failed" />
            <Input name="secondEventType" label="Second event type" required placeholder="firewall_block" />
          </div>
          <Input name="windowMinutes" label="Window (minutes)" type="number" min="1" max="1440" required defaultValue="5" />
          <Input name="description" label="Description (optional)" />
          <div className="sc-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create rule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
