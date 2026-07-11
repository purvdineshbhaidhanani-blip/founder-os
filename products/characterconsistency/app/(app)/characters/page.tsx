"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { EmptyState, ErrorState, Skeleton, Modal, Button, Input, Textarea, useToast } from "@founder-os/ui/primitives";

interface CharacterRow {
  id: string;
  name: string;
  description: string;
  artStyle: string;
}

export default function CharactersPage() {
  const { show } = useToast();
  const [characters, setCharacters] = useState<CharacterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/characters");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message);
      setCharacters(body.data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load characters.");
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
      const response = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
          faceDescription: formData.get("faceDescription"),
          hairDescription: formData.get("hairDescription"),
          outfitDescription: formData.get("outfitDescription"),
          artStyle: formData.get("artStyle"),
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't create character", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Character created", variant: "success" });
      setIsModalOpen(false);
      load();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Characters</h1>
          <p className="cc-page-description">Your persistent character identity library.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New character</Button>
      </div>

      {isLoading ? (
        <Skeleton style={{ height: 200 }} />
      ) : error ? (
        <ErrorState description={error} onRetry={load} />
      ) : characters.length === 0 ? (
        <EmptyState title="No characters yet" description="Create a character to lock its identity and start generating consistent prompts." />
      ) : (
        characters.map((character) => (
          <div key={character.id} className="cc-copilot-action">
            <div className="cc-copilot-action-header">
              <Link href={`/characters/${character.id}`}>
                <strong>{character.name}</strong>
              </Link>
            </div>
            <p>{character.description}</p>
            <p className="cc-page-description">Art style: {character.artStyle}</p>
          </div>
        ))
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New character" description="Define this character's locked identity.">
        <form className="cc-auth-form" onSubmit={handleCreate}>
          <Input name="name" label="Character name" required placeholder="Nova" />
          <Textarea name="description" label="Short description" rows={2} required placeholder="A cyberpunk courier with a mysterious past" />
          <Input name="faceDescription" label="Face" required placeholder="sharp jawline, freckles, warm brown eyes" />
          <Input name="hairDescription" label="Hair" required placeholder="short blonde hair, undercut" />
          <Input name="outfitDescription" label="Outfit" required placeholder="a red leather jacket over a black bodysuit" />
          <Input name="artStyle" label="Art style" required placeholder="cel-shaded anime" />
          <div className="cc-form-actions">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Create character
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
