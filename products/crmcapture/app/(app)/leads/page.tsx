"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Modal, Button, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string | null;
}

interface LeadRow {
  id: string;
  status: string;
  score: number;
  source: string;
  contact: { firstName: string; lastName: string | null; company: string | null };
}

const STATUS_BADGE: Record<string, "default" | "info" | "warning" | "success" | "destructive"> = {
  new: "info",
  contacted: "default",
  qualified: "warning",
  converted: "success",
  lost: "destructive",
};

export default function LeadsPage() {
  const { show } = useToast();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      const [leadsRes, contactsRes] = await Promise.all([fetch(`/api/leads?${params.toString()}`), fetch("/api/contacts")]);
      const leadsBody = await leadsRes.json();
      const contactsBody = await contactsRes.json();
      if (!leadsRes.ok) throw new Error(leadsBody.error?.message);
      setLeads(leadsBody.data.data);
      if (contactsRes.ok) setContacts(contactsBody.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: formData.get("contactId") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't create lead", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: `Lead created — score ${body.data.score}`, variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<LeadRow>[] = [
    { key: "name", header: "Lead", render: (row) => <Link href={`/leads/${row.id}`}>{`${row.contact.firstName} ${row.contact.lastName ?? ""}`.trim()}</Link> },
    { key: "company", header: "Company", render: (row) => row.contact.company ?? "—" },
    { key: "status", header: "Status", render: (row) => <Badge variant={STATUS_BADGE[row.status] ?? "default"}>{row.status}</Badge> },
    { key: "score", header: "Score", sortable: true, render: (row) => String(row.score) },
    { key: "source", header: "Source", render: (row) => row.source.replace("_", " ") },
  ];

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Leads</h1>
          <p className="cc-page-description">Every lead, ranked by score.</p>
        </div>
        <div className="cc-form-actions">
          <Select
            name="status"
            label="Status"
            hideLabel
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={[
              { value: "", label: "All statuses" },
              { value: "new", label: "New" },
              { value: "contacted", label: "Contacted" },
              { value: "qualified", label: "Qualified" },
              { value: "converted", label: "Converted" },
              { value: "lost", label: "Lost" },
            ]}
          />
          <Button onClick={() => setIsModalOpen(true)} disabled={contacts.length === 0}>
            New lead
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={leads}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No leads yet"
        emptyDescription="Add a contact first, then create a lead from it."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New lead" description="Create a lead from an existing contact.">
        <form className="cc-auth-form" onSubmit={handleCreate}>
          <Select
            name="contactId"
            label="Contact"
            options={contacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName ?? ""}`.trim() }))}
            placeholder="Select a contact"
            required
          />
          <div className="cc-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
