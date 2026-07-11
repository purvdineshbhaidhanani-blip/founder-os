import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getCharacterConsistencyDb } from "../db.js";
import { getCharacter } from "./characters-repo.js";

const dnaOutputSchema = z.object({
  detailedPromptTemplate: z.string().describe("A rich, detailed, reusable base prompt describing this character's fixed identity — face, hair, outfit, proportions, style."),
  negativePrompt: z.string().describe("A negative prompt listing attributes to avoid, to prevent identity drift across generations."),
  lockedAttributes: z.record(z.string(), z.string()).describe("Key-value pairs of locked attributes, e.g. hair_color, eye_color, build."),
  distinguishingFeatures: z.array(z.string()).max(10).describe("Unique identifying marks or features (scars, accessories, tattoos, etc.)."),
});

/**
 * AI Character DNA — the Killer Feature per
 * products/characterconsistency/docs/PRODUCT_IDENTITY.md §5: "Generate a
 * character once, then preserve the same face, hairstyle, clothing,
 * proportions, and identity across every image." Expands a short
 * character description into a locked, detailed, reusable prompt
 * specification — the persistent identity object this product exists to
 * provide. Actual pixel rendering from this spec requires a Phase 2
 * image-generation provider; this call produces the specification a
 * creator can paste into any image generator today.
 */
export async function generateCharacterDNA(params: { organizationId: string; characterId: string; requestedByUserId: string }) {
  const character = await getCharacter({ organizationId: params.organizationId, characterId: params.characterId });
  if (!character) {
    throw new Error("Character not found");
  }

  const context = [
    `Character: ${character.name}`,
    `Description: ${character.description}`,
    `Face: ${character.faceDescription}`,
    `Hair: ${character.hairDescription}`,
    `Outfit: ${character.outfitDescription}`,
    `Art style: ${character.artStyle}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "characterconsistency.character_dna",
    organizationId: params.organizationId,
    system:
      "You are a character design consistency expert for AI image generation. Given a character's core description, produce a detailed, reusable base prompt that locks their identity (face, hair, outfit, proportions, art style), a negative prompt to prevent drift, a structured map of locked attributes, and a list of distinguishing features. Only reference facts present in the input — never invent details not given.",
    schema: dnaOutputSchema,
    schemaDescription: '{ "detailedPromptTemplate": string, "negativePrompt": string, "lockedAttributes": Record<string,string>, "distinguishingFeatures": string[] }',
    messages: [{ role: "user", content: context }],
  });

  const db = getCharacterConsistencyDb();
  const record = await db.characterDNA.upsert({
    where: { characterId: params.characterId },
    create: {
      organizationId: params.organizationId,
      characterId: params.characterId,
      detailedPromptTemplate: response.data.detailedPromptTemplate,
      negativePrompt: response.data.negativePrompt,
      lockedAttributes: response.data.lockedAttributes,
      distinguishingFeatures: response.data.distinguishingFeatures,
    },
    update: {
      detailedPromptTemplate: response.data.detailedPromptTemplate,
      negativePrompt: response.data.negativePrompt,
      lockedAttributes: response.data.lockedAttributes,
      distinguishingFeatures: response.data.distinguishingFeatures,
      generatedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "characterconsistency.dna_generated", properties: { characterId: params.characterId } },
    (err) => captureError(err, { feature: "characterconsistency.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "character_dna",
    title: "Character DNA ready",
    body: `AI Character DNA generated for "${character.name}".`,
    channels: [],
  });

  return record;
}
