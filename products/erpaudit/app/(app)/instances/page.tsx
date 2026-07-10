"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Select, Textarea, Badge, useToast } from "@founder-os/ui/primitives";

interface InstanceRow {
  id: string;
  name: string;
  erpSystem: "sap" | "oracle" | "dynamics";
}

function parseRoleAssignments(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [userIdentifier, permission] = line.split(",").map((s) => s.trim());
      return { userIdentifier, permission };
    })
    .filter((a) => a.userIdentifier && a.permission);
}

function parseConfigSettings(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return { key: key?.trim() ?? "", value: rest.join("=").trim() };
    })
    .filter((s) => s.key);
}

export default function InstancesPage() {
  const { show } = useToast();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanInstanceId, setScanInstanceId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/instances");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setInstances(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ERP instances.");
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
      const response = await fetch("/api/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name"), erpSystem: formData.get("erpSystem") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't add instance", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "ERP instance added", variant: "success" });
      setIsAddModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scanInstanceId) return;
    setIsScanning(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: scanInstanceId,
          roleAssignments: parseRoleAssignments(String(formData.get("roleAssignments") ?? "")),
          configSettings: parseConfigSettings(String(formData.get("configSettings") ?? "")),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't run scan", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: `Scan complete — compliance score ${body.data.complianceScore}`, variant: "success" });
      setScanInstanceId(null);
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div>
      <div className="ea-page-header">
        <div>
          <h1 className="ea-page-title">ERP instances</h1>
          <p className="ea-page-description">Every SAP, Oracle, or Dynamics environment you audit.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>Add instance</Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : instances.length === 0 ? (
        <EmptyState title="No ERP instances yet" description="Add an instance, then import a configuration export to run your first scan." />
      ) : (
        instances.map((instance) => (
          <div key={instance.id} className="ea-copilot-action">
            <div className="ea-copilot-action-header">
              <strong>{instance.name}</strong>
              <Badge variant="secondary">{instance.erpSystem}</Badge>
            </div>
            <div className="ea-form-actions">
              <Link href={`/findings?instanceId=${instance.id}`}>View findings</Link>
              <Button variant="outline" onClick={() => setScanInstanceId(instance.id)}>
                Run scan
              </Button>
            </div>
          </div>
        ))
      )}

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add ERP instance" description="Track a SAP, Oracle, or Dynamics environment.">
        <form className="ea-auth-form" onSubmit={handleCreate}>
          <Input name="name" label="Instance name" required placeholder="acme-prod-sap" />
          <Select
            name="erpSystem"
            label="ERP system"
            defaultValue="sap"
            options={[
              { value: "sap", label: "SAP" },
              { value: "oracle", label: "Oracle" },
              { value: "dynamics", label: "Microsoft Dynamics" },
            ]}
          />
          <div className="ea-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add instance
            </Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={scanInstanceId !== null} onClose={() => setScanInstanceId(null)} title="Run a scan" description="Paste role assignments and config settings from your configuration export.">
        <form className="ea-auth-form" onSubmit={handleScan}>
          <Textarea
            name="roleAssignments"
            label="Role assignments (user,permission per line)"
            rows={6}
            placeholder={"jdoe,create_vendor\njdoe,approve_payment"}
          />
          <Textarea
            name="configSettings"
            label="Config settings (key=value per line)"
            rows={6}
            placeholder={"four_eyes_control_enabled=false\napproval_threshold_usd=5000"}
          />
          <div className="ea-form-actions">
            <Button type="button" variant="outline" onClick={() => setScanInstanceId(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isScanning}>
              Run scan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
