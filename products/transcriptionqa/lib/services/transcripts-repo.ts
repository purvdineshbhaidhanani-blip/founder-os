import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit, incrementUsage, can } from "@founder-os/platform/billing";
import { getTranscriptionQADb } from "../db.js";
import { computeAccuracyScore, detectSpeakerAttributionAnomalies, validateTerminology } from "./qa-engine.js";
import type { z } from "zod";
import type { createTranscriptSchema, listTranscriptsQuerySchema } from "../validation/transcripts.js";

type CreateTranscriptInput = z.infer<typeof createTranscriptSchema>;
type ListTranscriptsQuery = z.infer<typeof listTranscriptsQuerySchema>;

/**
 * Ingests a transcript (text + speaker-labeled segments, supplied by
 * the caller as exported from any transcription source) and runs the
 * deterministic QA engine — domain terminology validation (gated
 * behind the "use_domain_dictionary" entitlement, per §22) and
 * speaker-attribution anomaly detection (available on every tier) —
 * persisting findings and computing an accuracy score, per
 * docs/PRODUCT_IDENTITY.md §7's Must-Have feature set.
 */
export async function createTranscript(params: { organizationId: string; createdByUserId: string; input: CreateTranscriptInput }) {
  const db = getTranscriptionQADb();

  const uploadLimitCheck = await withinLimit(params.organizationId, "audio_uploads_monthly");
  if (!uploadLimitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${uploadLimitCheck.limit} upload(s) this billing period. Upgrade your plan to review more transcripts.`);
  }
  const minutesLimitCheck = await withinLimit(params.organizationId, "processing_minutes_monthly");
  if (!minutesLimitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${minutesLimitCheck.limit} processing minute(s) this billing period. Upgrade your plan for more.`);
  }

  const wordCount = params.input.segments.reduce((total, s) => total + s.text.trim().split(/\s+/).filter(Boolean).length, 0);

  const transcript = await db.transcript.create({
    data: {
      organizationId: params.organizationId,
      createdByUserId: params.createdByUserId,
      title: params.input.title,
      sourceLabel: params.input.sourceLabel,
      estimatedMinutes: params.input.estimatedMinutes,
      wordCount,
    },
  });

  const segments = await db.$transaction(
    params.input.segments.map((segment, index) =>
      db.transcriptSegment.create({
        data: {
          organizationId: params.organizationId,
          transcriptId: transcript.id,
          sequenceIndex: index,
          speakerLabel: segment.speakerLabel,
          text: segment.text,
        },
      }),
    ),
  );

  const useDomainDictionary = await can(params.organizationId, "use_domain_dictionary");
  const findingCandidates = [
    ...(useDomainDictionary ? validateTerminology(segments) : []),
    ...detectSpeakerAttributionAnomalies(segments),
  ];

  if (findingCandidates.length > 0) {
    await db.finding.createMany({
      data: findingCandidates.map((f) => ({
        organizationId: params.organizationId,
        transcriptId: transcript.id,
        segmentId: f.segmentId,
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
        suggestedCorrection: f.suggestedCorrection,
      })),
    });
  }

  const accuracyScore = computeAccuracyScore(findingCandidates);

  await incrementUsage({ organizationId: params.organizationId, metricKey: "audio_uploads_monthly", amount: 1 });
  await incrementUsage({ organizationId: params.organizationId, metricKey: "processing_minutes_monthly", amount: params.input.estimatedMinutes });

  return db.transcript.update({ where: { id: transcript.id }, data: { accuracyScore } });
}

export async function listTranscripts(params: { organizationId: string; query: ListTranscriptsQuery }) {
  const db = getTranscriptionQADb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.transcript.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getTranscript(params: { organizationId: string; transcriptId: string }) {
  const db = getTranscriptionQADb();
  return db.transcript.findFirst({
    where: { id: params.transcriptId, organizationId: params.organizationId },
    include: {
      segments: { orderBy: { sequenceIndex: "asc" } },
      findings: { include: { segment: true }, orderBy: { severity: "asc" } },
    },
  });
}
