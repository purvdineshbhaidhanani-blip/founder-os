"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Textarea, useToast } from "@founder-os/ui/primitives";

interface CharacterDNA {
  detailedPromptTemplate: string;
  negativePrompt: string;
  distinguishingFeatures: string[];
}

interface CharacterDetail {
  id: string;
  name: string;
  description: string;
  faceDescription: string;
  hairDescription: string;
  outfitDescription: string;
  artStyle: string;
  dna: CharacterDNA | null;
}

export default function CharacterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { show } = useToast();
  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingDNA, setIsGeneratingDNA] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<{ assembledPrompt: string; consistencyScore: number; driftWarnings: string[] } | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/characters/${id}`);
      const body = await response.json();
      if (response.ok) setCharacter(body.data);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function generateDNA() {
    setIsGeneratingDNA(true);
    try {
      const response = await fetch(`/api/characters/${id}/dna`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "AI Character DNA unavailable", description: body.error?.message, variant: "destructive" });
        return;
      }
      show({ title: "Character DNA ready", variant: "success" });
      load();
    } finally {
      setIsGeneratingDNA(false);
    }
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsGenerating(true);
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: id,
          poseDescription: formData.get("poseDescription"),
          sceneDescription: formData.get("sceneDescription") || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        show({ title: "Couldn't create generation", description: body.error?.message, variant: "destructive" });
        return;
      }
      setLastResult(body.data);
      show({ title: `Prompt assembled — consistency score ${body.data.consistencyScore}`, variant: body.data.driftWarnings.length > 0 ? "warning" : "success" });
      (event.target as HTMLFormElement).reset();
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading || !character) return <p className="cc-page-description">Loading…</p>;

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">{character.name}</h1>
          <p className="cc-page-description">{character.description}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI Character DNA</CardTitle>
          <CardDescription>Expands this character into a locked, reusable prompt specification.</CardDescription>
        </CardHeader>
        <CardContent>
          {character.dna ? (
            <div>
              <h3 className="cc-section-title">Detailed prompt template</h3>
              <pre className="cc-code-snippet">{character.dna.detailedPromptTemplate}</pre>
              <h3 className="cc-section-title">Negative prompt</h3>
              <pre className="cc-code-snippet">{character.dna.negativePrompt}</pre>
              {character.dna.distinguishingFeatures.length > 0 && (
                <>
                  <h3 className="cc-section-title">Distinguishing features</h3>
                  <ul className="cc-category-list">
                    {character.dna.distinguishingFeatures.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <p className="cc-page-description">No AI Character DNA generated yet.</p>
          )}
          <div className="cc-form-actions">
            <Button onClick={generateDNA} isLoading={isGeneratingDNA}>
              {character.dna ? "Regenerate DNA" : "Generate Character DNA"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>New generation</CardTitle>
          <CardDescription>Assembles a locked, consistency-checked prompt for a new pose.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="cc-auth-form" onSubmit={handleGenerate}>
            <Input name="poseDescription" label="Pose" required placeholder="running through rain, looking back over shoulder" />
            <Textarea name="sceneDescription" label="Scene (optional)" rows={2} placeholder="a neon-lit city street at night" />
            <div className="cc-form-actions">
              <Button type="submit" isLoading={isGenerating}>
                Assemble prompt
              </Button>
            </div>
          </form>
          {lastResult && (
            <div className="cc-copilot-action">
              <div className="cc-copilot-action-header">
                <strong>Consistency score: {lastResult.consistencyScore}</strong>
              </div>
              <pre className="cc-code-snippet">{lastResult.assembledPrompt}</pre>
              {lastResult.driftWarnings.length > 0 && (
                <ul className="cc-category-list">
                  {lastResult.driftWarnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
