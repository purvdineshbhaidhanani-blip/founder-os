"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Input, Modal, useToast } from "@founder-os/ui/primitives";

interface Project {
  id: string;
  name: string;
  environment: string;
  requireMfa: boolean;
  sessionTtlMinutes: number;
}

interface ApiKeyRow {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isRunningAdvisor, setIsRunningAdvisor] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const [projectRes, keysRes] = await Promise.all([fetch(`/api/projects/${id}`), fetch(`/api/projects/${id}/keys`)]);
      const projectBody = await projectRes.json();
      if (projectRes.ok) setProject(projectBody.data);
      const keysBody = await keysRes.json();
      if (keysRes.ok) setApiKeys(keysBody.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingKey(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/projects/${id}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't create API key", description: body.error?.message, variant: "destructive" });
        return;
      }
      setNewRawKey(body.data.rawKey);
      setIsModalOpen(false);
      load();
    } finally {
      setIsCreatingKey(false);
    }
  }

  async function runSecurityAdvisor() {
    setIsRunningAdvisor(true);
    try {
      const response = await fetch(`/api/projects/${id}/security/run`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't run Security Advisor", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: `Security Advisor complete — ${body.data.length} new finding(s)`, variant: "success" });
    } finally {
      setIsRunningAdvisor(false);
    }
  }

  if (isLoading || !project) return <p className="au-page-description">Loading…</p>;

  return (
    <div>
      <div className="au-page-header">
        <div>
          <h1 className="au-page-title">{project.name}</h1>
          <p className="au-page-description">
            {project.environment} · MFA {project.requireMfa ? "enforced" : "not enforced"} · Sessions expire after {project.sessionTtlMinutes} minutes
          </p>
        </div>
        <Button variant="outline" onClick={runSecurityAdvisor} isLoading={isRunningAdvisor}>
          Run Security Advisor
        </Button>
      </div>

      {newRawKey && (
        <Card>
          <CardHeader>
            <CardTitle>New API key created</CardTitle>
            <CardDescription>Copy this key now — it will not be shown again.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="au-code-snippet">{newRawKey}</pre>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>API keys</CardTitle>
          <CardDescription>Used by your app to call the public /api/v1/auth endpoints for this project.</CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="au-page-description">No API keys yet.</p>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="au-copilot-action">
                <div className="au-copilot-action-header">
                  <strong>{key.name}</strong>
                  <Badge variant="secondary">{key.keyPrefix}…</Badge>
                </div>
                <p>{key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleString()}` : "Never used"}</p>
              </div>
            ))
          )}
          <div className="au-form-actions">
            <Button onClick={() => setIsModalOpen(true)}>New API key</Button>
          </div>
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New API key" description="Name it after where it will be used.">
        <form className="au-auth-form" onSubmit={handleCreateKey}>
          <Input name="name" label="Key name" required placeholder="production-backend" />
          <div className="au-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreatingKey}>
              Create key
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
