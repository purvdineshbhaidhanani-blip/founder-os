import { z } from "zod";

export const segmentInputSchema = z.object({
  speakerLabel: z.string().min(1).max(120),
  text: z.string().min(1).max(5000),
});

export const createTranscriptSchema = z.object({
  title: z.string().min(1).max(200),
  sourceLabel: z.string().min(1).max(120),
  estimatedMinutes: z.number().min(0).max(1000),
  segments: z.array(segmentInputSchema).min(1).max(2000),
});

export const listTranscriptsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listFindingsQuerySchema = z.object({
  transcriptId: z.string().uuid().optional(),
  status: z.enum(["open", "resolved"]).optional(),
  category: z.enum(["terminology", "speaker_attribution"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateFindingStatusSchema = z.object({
  status: z.enum(["open", "resolved"]),
});
