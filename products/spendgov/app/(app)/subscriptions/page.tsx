"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Modal, Button, Input, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface SubscriptionRow {
  id: string;
  kind: "saas" | "ai_tool";
  vendorName: string;
  productName: string;
  category: string;
  status: string;
  monthlyCostCents: number;
  seatsPurchased: number | null;
  seatsActive: number | null;
  renewalDate: string | null;
}

export default function SubscriptionsPage() {
  const { show: showToast } = useToast();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadSubscriptions() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/subscriptions");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Failed to load subscriptions.");
      setSubscriptions(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSubscriptions();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: formData.get("kind"),
          vendorName: formData.get("vendorName"),
          productName: formData.get("productName"),
          category: formData.get("category"),
          monthlyCostCents: Math.round(Number(formData.get("monthlyCost")) * 100),
          seatsPurchased: formData.get("seatsPurchased") ? Number(formData.get("seatsPurchased")) : undefined,
          seatsActive: formData.get("seatsActive") ? Number(formData.get("seatsActive")) : undefined,
          renewalDate: formData.get("renewalDate") || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        showToast({ title: "Couldn't add subscription", description: body.error?.message, variant: "destructive" });
        return;
      }
      showToast({ title: "Subscription added", variant: "success" });
      setIsModalOpen(false);
      loadSubscriptions();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<SubscriptionRow>[] = [
    { key: "vendorName", header: "Vendor", sortable: true, render: (row) => row.vendorName },
    { key: "productName", header: "Product", render: (row) => row.productName },
    { key: "category", header: "Category", render: (row) => row.category },
    { key: "kind", header: "Type", render: (row) => <Badge variant={row.kind === "ai_tool" ? "info" : "default"}>{row.kind === "ai_tool" ? "AI tool" : "SaaS"}</Badge> },
    { key: "monthlyCostCents", header: "Monthly cost", align: "right", render: (row) => `$${(row.monthlyCostCents / 100).toLocaleString()}` },
    { key: "seats", header: "Seats", render: (row) => (row.seatsPurchased ? `${row.seatsActive ?? 0} / ${row.seatsPurchased}` : "—") },
    { key: "status", header: "Status", render: (row) => <Badge variant={row.status === "active" ? "success" : "secondary"}>{row.status}</Badge> },
  ];

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Subscriptions</h1>
          <p className="sg-page-description">Every SaaS app and AI tool your organization is paying for.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add subscription</Button>
      </div>

      <DataTable
        columns={columns}
        rows={subscriptions}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={loadSubscriptions}
        emptyTitle="No subscriptions tracked yet"
        emptyDescription="Add your first SaaS app or AI tool to start finding waste."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add a subscription" description="Track a SaaS app or AI tool's cost and usage.">
        <form className="sg-auth-form" onSubmit={handleCreate}>
          <Select name="kind" label="Type" defaultValue="saas" options={[{ value: "saas", label: "SaaS app" }, { value: "ai_tool", label: "AI tool" }]} />
          <div className="sg-form-grid">
            <Input name="vendorName" label="Vendor" required />
            <Input name="productName" label="Product" required />
          </div>
          <Input name="category" label="Category" required placeholder="e.g. project_management" />
          <div className="sg-form-grid">
            <Input name="monthlyCost" label="Monthly cost (USD)" type="number" step="0.01" min="0" required />
            <Input name="renewalDate" label="Renewal date" type="date" />
          </div>
          <div className="sg-form-grid">
            <Input name="seatsPurchased" label="Seats purchased (optional)" type="number" min="0" />
            <Input name="seatsActive" label="Seats active (optional)" type="number" min="0" />
          </div>
          <div className="sg-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add subscription
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
