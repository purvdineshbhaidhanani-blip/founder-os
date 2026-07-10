"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Select, Badge, useToast } from "@founder-os/ui/primitives";

interface RepositoryRow {
  id: string;
  name: string;
  defaultBranch: string;
  visibility: "private" | "public";
  createdAt: string;
}

export default function RepositoriesPage() {
  const { show } = useToast();
  const [repositories, setRepositories] = useState<RepositoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/repositories");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setRepositories(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load repositories.");
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
      const response = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          defaultBranch: formData.get("defaultBranch") || "main",
          visibility: formData.get("visibility"),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't add repository", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Repository added", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Repositories</h1>
          <p className="ca-page-description">Repos tracked for scanning.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add repository</Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : repositories.length === 0 ? (
        <EmptyState title="No repositories yet" description="Add a repository to start scanning your code." />
      ) : (
        repositories.map((repo) => (
          <div key={repo.id} className="ca-copilot-action">
            <div className="ca-copilot-action-header">
              <Link href={`/scans?repositoryId=${repo.id}`}>
                <strong>{repo.name}</strong>
              </Link>
              <Badge variant={repo.visibility === "public" ? "info" : "secondary"}>{repo.visibility}</Badge>
            </div>
            <p>Default branch: {repo.defaultBranch}</p>
          </div>
        ))
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add repository" description="Track a repository for code scanning.">
        <form className="ca-auth-form" onSubmit={handleCreate}>
          <Input name="name" label="Repository name" required placeholder="my-org/my-service" />
          <Input name="defaultBranch" label="Default branch" defaultValue="main" />
          <Select
            name="visibility"
            label="Visibility"
            defaultValue="private"
            options={[
              { value: "private", label: "Private" },
              { value: "public", label: "Public" },
            ]}
          />
          <div className="ca-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Add repository
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
