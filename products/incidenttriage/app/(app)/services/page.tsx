"use client";

import { useEffect, useState, type FormEvent } from "react";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Badge, useToast } from "@founder-os/ui/primitives";

interface ServiceRow {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down";
}

const STATUS_BADGE: Record<string, "success" | "warning" | "destructive"> = {
  healthy: "success",
  degraded: "warning",
  down: "destructive",
};

export default function ServicesPage() {
  const { show } = useToast();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/services");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setServices(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services.");
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
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't add service", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Service added", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="it-page-header">
        <div>
          <h1 className="it-page-title">Services</h1>
          <p className="it-page-description">Every service tracked for alerting and health.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add service</Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : services.length === 0 ? (
        <EmptyState title="No services yet" description="Add a service to start ingesting alerts and tracking health." />
      ) : (
        services.map((service) => (
          <div key={service.id} className="it-copilot-action">
            <div className="it-copilot-action-header">
              <strong>{service.name}</strong>
              <Badge variant={STATUS_BADGE[service.status]}>{service.status}</Badge>
            </div>
          </div>
        ))
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add service" description="Track a service for alert ingestion and health monitoring.">
        <form className="it-auth-form" onSubmit={handleCreate}>
          <Input name="name" label="Service name" required placeholder="checkout-api" />
          <div className="it-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add service
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
