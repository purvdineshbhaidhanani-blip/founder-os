import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getCharacterConsistencyDb } from "../db.js";
import type { z } from "zod";
import type { createCharacterSchema, listCharactersQuerySchema } from "../validation/characters.js";

type CreateCharacterInput = z.infer<typeof createCharacterSchema>;
type ListCharactersQuery = z.infer<typeof listCharactersQuerySchema>;

export async function createCharacter(params: { organizationId: string; createdByUserId: string; input: CreateCharacterInput }) {
  const db = getCharacterConsistencyDb();

  const limitCheck = await withinLimit(params.organizationId, "characters");
  const currentCount = await db.character.count({ where: { organizationId: params.organizationId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} character(s). Upgrade your plan to create more.`);
  }

  return db.character.create({
    data: {
      organizationId: params.organizationId,
      name: params.input.name,
      description: params.input.description,
      faceDescription: params.input.faceDescription,
      hairDescription: params.input.hairDescription,
      outfitDescription: params.input.outfitDescription,
      artStyle: params.input.artStyle,
      createdByUserId: params.createdByUserId,
    },
  });
}

export async function listCharacters(params: { organizationId: string; query: ListCharactersQuery }) {
  const db = getCharacterConsistencyDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.character.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getCharacter(params: { organizationId: string; characterId: string }) {
  const db = getCharacterConsistencyDb();
  return db.character.findFirst({
    where: { id: params.characterId, organizationId: params.organizationId },
    include: { dna: true },
  });
}
