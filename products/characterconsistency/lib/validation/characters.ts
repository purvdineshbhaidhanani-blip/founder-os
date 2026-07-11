import { z } from "zod";

export const createCharacterSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  faceDescription: z.string().min(1).max(500),
  hairDescription: z.string().min(1).max(500),
  outfitDescription: z.string().min(1).max(500),
  artStyle: z.string().min(1).max(200),
});

export const listCharactersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createGenerationSchema = z.object({
  characterId: z.string().uuid(),
  poseDescription: z.string().min(1).max(1000),
  sceneDescription: z.string().max(1000).optional(),
});

export const listGenerationsQuerySchema = z.object({
  characterId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
