import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getCodeAuditDb } from "../db.js";
import { getFinding } from "./findings-repo.js";

const fixSuggestionOutputSchema = z.object({
  explanation: z.string().describe("Plain-language explanation of WHY this finding matters and its business impact."),
  suggestedPatch: z.string().describe("A concrete, production-ready code fix for the exact snippet given — diff-style or corrected snippet."),
  riskScore: z.number().int().min(1).max(10).describe("1-10 risk score based on severity, likelihood, and context."),
});

/**
 * AI Fix Engine per products/codeaudit/docs/PRODUCT_IDENTITY.md §5
 * "Killer Feature — AI Fix Engine (Pro tier)" and §28 items 2, 3, 5
 * (educational feedback, risk scoring, auto-fix suggestions) combined
 * into a single AI call per finding.
 */
export async function generateFixSuggestion(params: { organizationId: string; findingId: string; requestedByUserId: string }) {
  const finding = await getFinding({ organizationId: params.organizationId, findingId: params.findingId });
  if (!finding) {
    throw new Error("Finding not found");
  }

  const context = [
    `Finding: ${finding.title} (severity: ${finding.severity}, category: ${finding.category}${finding.cwe ? `, ${finding.cwe}` : ""})`,
    `File: ${finding.filePath}:${finding.line}`,
    `Description: ${finding.description}`,
    `Code snippet:\n${finding.snippet}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "codeaudit.fix_engine",
    organizationId: params.organizationId,
    system:
      "You are a senior application security and code quality engineer. Given a static-analysis finding and its code snippet, explain why it matters in plain language, propose a concrete production-ready fix for the exact snippet, and assign a 1-10 risk score based on severity, likelihood of exploitation, and context. Only reference facts present in the input — never invent surrounding code you cannot see.",
    schema: fixSuggestionOutputSchema,
    schemaDescription: '{ "explanation": string, "suggestedPatch": string, "riskScore": number }',
    messages: [{ role: "user", content: context }],
  });

  const db = getCodeAuditDb();
  const record = await db.fixSuggestion.upsert({
    where: { findingId: params.findingId },
    create: {
      organizationId: params.organizationId,
      findingId: params.findingId,
      explanation: response.data.explanation,
      suggestedPatch: response.data.suggestedPatch,
      riskScore: response.data.riskScore,
    },
    update: {
      explanation: response.data.explanation,
      suggestedPatch: response.data.suggestedPatch,
      riskScore: response.data.riskScore,
      generatedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "codeaudit.fix_suggestion_generated", properties: { findingId: params.findingId } },
    (err) => captureError(err, { feature: "codeaudit.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "fix_suggestion",
    title: "AI fix suggestion ready",
    body: `A suggested fix is ready for "${finding.title}".`,
    channels: [],
  });

  return record;
}
