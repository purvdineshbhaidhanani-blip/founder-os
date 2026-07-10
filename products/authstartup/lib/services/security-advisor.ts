import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getAuthStartupDb } from "../db.js";
import { getSecurityFinding } from "./security-repo.js";

const recommendationOutputSchema = z.object({
  explanation: z.string().describe("Plain-language explanation of why this finding matters and its potential impact."),
  recommendedAction: z.string().describe("A concrete, actionable next step the developer can take right now to resolve it."),
});

/**
 * AI Security Advisor — the Killer Feature per
 * products/authstartup/docs/PRODUCT_IDENTITY.md §5: "Continuously
 * monitors authentication activity and proactively suggests security
 * improvements... before they become incidents." Layers explanation and
 * a concrete recommended action on top of a rule-engine finding
 * (security-rules.ts decides WHETHER a finding exists; this only
 * explains it).
 */
export async function generateSecurityRecommendation(params: { organizationId: string; findingId: string; requestedByUserId: string }) {
  const finding = await getSecurityFinding({ organizationId: params.organizationId, findingId: params.findingId });
  if (!finding) {
    throw new Error("Finding not found");
  }

  const context = [
    `Security finding: ${finding.title} (severity: ${finding.severity})`,
    `Project: ${finding.project.name} (${finding.project.environment})`,
    `Description: ${finding.description}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "authstartup.security_advisor",
    organizationId: params.organizationId,
    system:
      "You are a security advisor for a SaaS startup's authentication configuration. Given a security posture finding, explain why it matters in plain language and give one concrete, actionable recommendation. Only reference facts present in the input — never invent metrics or context not given.",
    schema: recommendationOutputSchema,
    schemaDescription: '{ "explanation": string, "recommendedAction": string }',
    messages: [{ role: "user", content: context }],
  });

  const db = getAuthStartupDb();
  const record = await db.securityRecommendation.upsert({
    where: { findingId: params.findingId },
    create: {
      organizationId: params.organizationId,
      findingId: params.findingId,
      explanation: response.data.explanation,
      recommendedAction: response.data.recommendedAction,
    },
    update: {
      explanation: response.data.explanation,
      recommendedAction: response.data.recommendedAction,
      generatedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "authstartup.security_recommendation_generated", properties: { findingId: params.findingId } },
    (err) => captureError(err, { feature: "authstartup.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "security_recommendation",
    title: "Security recommendation ready",
    body: `AI Security Advisor analyzed "${finding.title}".`,
    channels: [],
  });

  return record;
}
