import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { getTranscriptionQADb } from "../db.js";
import { getTranscript } from "./transcripts-repo.js";

const copilotOutputSchema = z.object({
  summary: z.string().describe("Concise, 2-4 sentence summary of the transcript's content, per docs/PRODUCT_IDENTITY.md's AI Summary feature."),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).describe("Overall publish/file readiness risk level given this transcript's findings and content."),
  highlightedRisks: z.array(z.string()).max(10).describe("Specific sections or phrases a reviewer should pay closest attention to before publishing or filing this transcript."),
});

/**
 * AI Accuracy Copilot + AI Summary — the Killer Feature per
 * products/transcriptionqa/docs/PRODUCT_IDENTITY.md §5: "Instead of
 * simply showing transcription errors, AI automatically detects
 * incorrect words, suggests corrections, flags medical/legal
 * terminology mistakes, calculates a confidence score, highlights
 * risky sections, and improves transcript quality before publishing."
 * Combines the AI Summary sub-feature (§18, §28) into the same call
 * per this portfolio's pattern of merging closely related PID
 * sub-features into one AI call. Explains the deterministic engine's
 * findings rather than re-deriving them, per this portfolio's
 * "explain, don't just flag" AI philosophy.
 */
export async function generateAccuracyCopilotBrief(params: { organizationId: string; transcriptId: string; requestedByUserId: string }) {
  const transcript = await getTranscript({ organizationId: params.organizationId, transcriptId: params.transcriptId });
  if (!transcript) {
    throw new PlatformError("NOT_FOUND", "Transcript not found.");
  }

  const transcriptText = transcript.segments.map((s) => `${s.speakerLabel}: ${s.text}`).join("\n");
  const findingsText =
    transcript.findings.length === 0
      ? "No findings — the deterministic QA engine found no terminology or speaker-attribution issues."
      : transcript.findings.map((f) => `- [${f.severity}] ${f.title}: ${f.description}`).join("\n");

  const context = [
    `Title: ${transcript.title} (source: ${transcript.sourceLabel})`,
    `Deterministic accuracy score: ${transcript.accuracyScore}/100`,
    `Findings:\n${findingsText}`,
    `Transcript:\n${transcriptText}`,
  ].join("\n\n");

  const response = await completeStructured({
    feature: "transcriptionqa.accuracy_copilot",
    organizationId: params.organizationId,
    system:
      "You are a transcript quality reviewer. Given a transcript and its deterministic QA findings, write a concise summary of the transcript's content, an overall risk level for publishing or filing it as-is, and a short list of the specific sections a human reviewer should focus on. Only reference facts present in the transcript and findings — never invent content not given.",
    schema: copilotOutputSchema,
    schemaDescription: '{ "summary": string, "riskLevel": "low"|"medium"|"high"|"critical", "highlightedRisks": string[] }',
    messages: [{ role: "user", content: context }],
  });

  const db = getTranscriptionQADb();
  const updated = await db.transcript.update({
    where: { id: transcript.id },
    data: {
      summary: response.data.summary,
      copilotRiskLevel: response.data.riskLevel,
      copilotHighlightedRisks: response.data.highlightedRisks,
      copilotGeneratedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "transcriptionqa.copilot_brief_generated", properties: { transcriptId: params.transcriptId } },
    (err) => captureError(err, { feature: "transcriptionqa.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "accuracy_copilot_brief",
    title: "AI Accuracy Copilot brief ready",
    body: `Copilot analysis complete for "${transcript.title}" — risk level: ${response.data.riskLevel}.`,
    channels: [],
  });

  return updated;
}
