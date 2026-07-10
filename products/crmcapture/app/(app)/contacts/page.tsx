"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DataTable, type DataTableColumn } from "@founder-os/ui/dashboard";
import { Modal, Button, Input, Select, Textarea, Badge, useToast } from "@founder-os/ui/primitives";

interface ContactRow {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  company: string | null;
  jobTitle: string | null;
  source: string;
}

interface DuplicateGroup {
  key: string;
  matchedOn: "email" | "phone";
  contacts: { id: string; firstName: string; lastName: string | null; email: string | null }[];
}

export default function ContactsPage() {
  const { show } = useToast();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

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
          source: formData.get("source"),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't add contact", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Contact added", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtract(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsExtracting(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/contacts/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: formData.get("rawText"), source: formData.get("source") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI extraction unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Contact extracted", variant: "success" });
      setIsExtractModalOpen(false);
      load();
    } finally {
      setIsExtracting(false);
    }
  }

  const columns: DataTableColumn<ContactRow>[] = [
    { key: "name", header: "Name", render: (row) => `${row.firstName} ${row.lastName ?? ""}`.trim() },
    { key: "email", header: "Email", render: (row) => row.email ?? "—" },
    { key: "company", header: "Company", render: (row) => row.company ?? "—" },
    { key: "jobTitle", header: "Title", render: (row) => row.jobTitle ?? "—" },
    { key: "source", header: "Source", render: (row) => <Badge variant="secondary">{row.source.replace("_", " ")}</Badge> },
  ];

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Contacts</h1>
          <p className="cc-page-description">Every person captured across your lead sources.</p>
        </div>
        <div className="cc-form-actions">
          <Button variant="outline" onClick={() => setIsExtractModalOpen(true)}>
            AI extract
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Add contact</Button>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="cc-copilot-action">
          <div className="cc-copilot-action-header">
            <strong>{duplicates.length} possible duplicate group(s) found</strong>
            <Badge variant="warning">review</Badge>
          </div>
          {duplicates.map((group) => (
            <p key={group.key}>
              Matched on {group.matchedOn}: {group.contacts.map((c) => `${c.firstName} ${c.lastName ?? ""}`.trim()).join(", ")}
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
        emptyDescription="Add a contact manually or extract one from raw text with AI."
      />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add contact" description="Add a contact manually.">
        <form className="cc-auth-form" onSubmit={handleCreate}>
          <div className="cc-form-grid">
            <Input name="firstName" label="First name" required />
            <Input name="lastName" label="Last name (optional)" />
          </div>
          <Input name="email" type="email" label="Email (optional)" />
          <div className="cc-form-grid">
            <Input name="phone" label="Phone (optional)" />
            <Select
              name="source"
              label="Source"
              defaultValue="manual"
              options={[
                { value: "manual", label: "Manual" },
                { value: "web_form", label: "Web form" },
                { value: "email", label: "Email" },
                { value: "linkedin", label: "LinkedIn" },
                { value: "csv_import", label: "CSV import" },
              ]}
            />
          </div>
          <div className="cc-form-grid">
            <Input name="company" label="Company (optional)" />
            <Input name="jobTitle" label="Job title (optional)" />
          </div>
          <div className="cc-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add contact
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isExtractModalOpen} onClose={() => setIsExtractModalOpen(false)} title="AI extract contact" description="Paste an email or web form submission and let AI structure it.">
        <form className="cc-auth-form" onSubmit={handleExtract}>
          <Select
            name="source"
            label="Source"
            defaultValue="email"
            options={[
              { value: "email", label: "Email" },
              { value: "web_form", label: "Web form" },
              { value: "linkedin", label: "LinkedIn" },
            ]}
          />
          <Textarea name="rawText" label="Raw text" rows={8} required placeholder="Paste the email or form submission text" />
          <div className="cc-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsExtractModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isExtracting}>
              Extract with AI
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
