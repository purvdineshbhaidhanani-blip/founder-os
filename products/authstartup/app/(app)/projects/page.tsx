"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface ProjectRow {
  id: string;
  name: string;
  environment: "development" | "production";
  requireMfa: boolean;
}

export default function ProjectsPage() {
  const { show } = useToast();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/projects");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setProjects(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects.");
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
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.get("name"), environment: formData.get("environment") }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't create project", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Project created", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="au-page-header">
        <div>
          <h1 className="au-page-title">Projects</h1>
          <p className="au-page-description">Each project is an isolated end-user pool with its own API keys.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New project</Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project to get an API key and start authenticating end users." />
      ) : (
        projects.map((project) => (
          <div key={project.id} className="au-copilot-action">
            <div className="au-copilot-action-header">
              <Link href={`/projects/${project.id}`}>
                <strong>{project.name}</strong>
              </Link>
              <Badge variant={project.environment === "production" ? "warning" : "secondary"}>{project.environment}</Badge>
            </div>
            <p>MFA enforced: {project.requireMfa ? "Yes" : "No"}</p>
          </div>
        ))
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New project" description="Each project is an isolated end-user pool.">
        <form className="au-auth-form" onSubmit={handleCreate}>
          <Input name="name" label="Project name" required placeholder="my-saas-app" />
          <Select
            name="environment"
            label="Environment"
            defaultValue="development"
            options={[
              { value: "development", label: "Development" },
              { value: "production", label: "Production" },
            ]}
          />
          <div className="au-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
