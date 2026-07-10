"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Modal, Button, Input, Badge, useToast } from "@founder-os/ui/primitives";

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  emailStatus: "valid" | "invalid" | "risky" | "unchecked";
  phoneStatus: "valid" | "invalid" | "risky" | "unchecked";
  healthScore: number;
}

interface DuplicateGroup {
  key: string;
  matchedOn: "email" | "phone" | "fuzzy_name";
  contacts: { id: string; firstName: string; lastName: string | null }[];
}

const STATUS_BADGE: Record<string, "success" | "destructive" | "warning" | "default"> = {
  valid: "success",
  invalid: "destructive",
  risky: "warning",
  unchecked: "default",
};

export default function ContactsPage() {
  const { show } = useToast();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const [contactsRes, dupesRes] = await Promise.all([fetch("/api/contacts"), fetch("/api/contacts/duplicates")]);
      const contactsBody = await contactsRes.json();
      if (!contactsRes.ok) throw new Error(contactsBody.error?.message);
      setContacts(contactsBody.data.data);
      if (dupesRes.ok) {
        const dupesBody = await dupesRes.json();
        setDuplicates(dupesBody.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts.");
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
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.get("firstName"),
          lastName: formData.get("lastName") || undefined,
          email: formData.get("email") || undefined,
          phone: formData.get("phone") || undefined,
          company: formData.get("company") || undefined,
          jobTitle: formData.get("jobTitle") || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't add contact", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: `Contact verified — health score ${body.data.healthScore}`, variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns: DataTableColumn<ContactRow>[] = [
    { key: "name", header: "Name", render: (row) => <Link href={`/contacts/${row.id}`}>{`${row.firstName} ${row.lastName ?? ""}`.trim()}</Link> },
    { key: "email", header: "Email", render: (row) => row.email ?? "—" },
    { key: "emailStatus", header: "Email status", render: (row) => <Badge variant={STATUS_BADGE[row.emailStatus]}>{row.emailStatus}</Badge> },
    { key: "phoneStatus", header: "Phone status", render: (row) => <Badge variant={STATUS_BADGE[row.phoneStatus]}>{row.phoneStatus}</Badge> },
    { key: "healthScore", header: "Health score", sortable: true, render: (row) => String(row.healthScore) },
  ];

  return (
    <div>
      <div className="cv-page-header">
        <div>
          <h1 className="cv-page-title">Contacts</h1>
          <p className="cv-page-description">Every contact, verified in real time.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add contact</Button>
      </div>

      {duplicates.length > 0 && (
        <div className="cv-copilot-action">
          <div className="cv-copilot-action-header">
            <strong>{duplicates.length} possible duplicate group(s) found</strong>
            <Badge variant="warning">review</Badge>
          </div>
          {duplicates.map((group) => (
            <p key={group.key}>
              Matched on {group.matchedOn.replace("_", " ")}: {group.contacts.map((c) => `${c.firstName} ${c.lastName ?? ""}`.trim()).join(", ")}
            </p>
          ))}
        </div>
      )}

      <DataTable
        columns={columns}
        rows={contacts}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error ?? undefined}
        onRetry={load}
        emptyTitle="No contacts yet"
        emptyDescription="Add a contact to run email and phone verification."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add contact" description="Runs email and phone verification immediately.">
        <form className="cv-auth-form" onSubmit={handleCreate}>
          <div className="cv-form-grid">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name (optional)" />
          </div>
          <Input name="email" type="email" label="Email (optional)" />
          <Input name="phone" label="Phone (optional)" />
          <div className="cv-form-grid">
            <Input name="company" label="Company (optional)" />
            <Input name="jobTitle" label="Job title (optional)" />
          </div>
          <div className="cv-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
