import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { incrementUsage, withinLimit } from "@founder-os/platform/billing";
import { getCharacterConsistencyDb } from "../db.js";
import { checkConsistency } from "./consistency-engine.js";
import { assemblePrompt } from "./prompt-assembler.js";
import type { z } from "zod";
import type { createGenerationSchema, listGenerationsQuerySchema } from "../validation/characters.js";

type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
type ListGenerationsQuery = z.infer<typeof listGenerationsQuerySchema>;

/**
 * Assembles a locked, consistency-checked prompt for a new pose/scene —
 * per products/characterconsistency/docs/PRODUCT_IDENTITY.md §7 "Pose
 * memory: Generate the same character in new poses without identity
 * drift." Reuses the character's locked description as the drift
 * baseline for every generation request.
 */
export async function createGeneration(params: { organizationId: string; requestedByUserId: string; input: CreateGenerationInput }) {
  const db = getCharacterConsistencyDb();

  const limitCheck = await withinLimit(params.organizationId, "generations_monthly");
  if (!limitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} generations this billing period. Upgrade your plan to generate more.`);
  }

  const character = await db.character.findFirst({
    where: { id: params.input.characterId, organizationId: params.organizationId },
    include: { dna: true },
  });
  if (!character) {
    throw new PlatformError("NOT_FOUND", "Character not found.");
  }

  const lockedDescription = [character.faceDescription, character.hairDescription, character.outfitDescription].join(", ");
  const requestDescription = [params.input.poseDescription, params.input.sceneDescription].filter(Boolean).join(", ");
  const { score, driftWarnings } = checkConsistency(lockedDescription, requestDescription);

  const assembledPrompt = assemblePrompt({
    characterName: character.name,
    faceDescription: character.faceDescription,
    hairDescription: character.hairDescription,
    outfitDescription: character.outfitDescription,
    artStyle: character.artStyle,
    distinguishingFeatures: character.dna?.distinguishingFeatures ?? [],
    poseDescription: params.input.poseDescription,
    sceneDescription: params.input.sceneDescription,
  });

  const generation = await db.generationRequest.create({
    data: {
      organizationId: params.organizationId,
      characterId: character.id,
      requestedByUserId: params.requestedByUserId,
      poseDescription: params.input.poseDescription,
      sceneDescription: params.input.sceneDescription,
      assembledPrompt,
      consistencyScore: score,
      driftWarnings,
    },
  });

  await incrementUsage({ organizationId: params.organizationId, metricKey: "generations_monthly", amount: 1 });

  return generation;
}

export async function listGenerations(params: { organizationId: string; query: ListGenerationsQuery }) {
  const db = getCharacterConsistencyDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.generationRequest.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.characterId ? { characterId: params.query.characterId } : {}),
        },
        include: { character: true },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}
