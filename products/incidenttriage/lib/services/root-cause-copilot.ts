import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getIncidentTriageDb } from "../db.js";
import { getIncident } from "./incidents-repo.js";

const rootCauseOutputSchema = z.object({
  hypothesis: z.string().describe("Plain-language explanation of what happened and why."),
  confidence: z.number().int().min(0).max(100).describe("0-100 confidence in this hypothesis given the available alert data."),
  culpritService: z.string().describe("The service most likely responsible for triggering this incident."),
  suggestedFix: z.string().describe("A concrete, actionable next step to resolve or mitigate the incident."),
  estimatedRecoveryMinutes: z.number().int().min(1).describe("Estimated minutes to recovery once the suggested fix is applied."),
});

/**
 * AI Root Cause Copilot — the Killer Feature per
 * products/incidenttriage/docs/PRODUCT_IDENTITY.md §5: "AI explains what
 * happened, why it happened, which service failed first, a suggested
 * fix, and estimated recovery time — replacing the first 30-45 minutes
 * of an incident with a 60-second AI-generated brief."
 */
export async function generateRootCauseAnalysis(params: { organizationId: string; incidentId: string; requestedByUserId: string }) {
  const incident = await getIncident({ organizationId: params.organizationId, incidentId: params.incidentId });
  if (!incident) {
    throw new Error("Incident not found");
  }

  const timeline = incident.alerts
    .map((alert) => `- [${alert.occurredAt.toISOString()}] (${alert.severity}, source: ${alert.source}) ${alert.message}`)
    .join("\n");

  const context = [
    `Incident: ${incident.title} (severity: ${incident.severity}, status: ${incident.status})`,
    `Service: ${incident.service.name}`,
    `Started: ${incident.startedAt.toISOString()}`,
    `Alert timeline:\n${timeline}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "incidenttriage.root_cause_copilot",
    organizationId: params.organizationId,
    system:
      "You are an SRE incident commander. Given an incident's alert timeline, produce a root cause hypothesis, a confidence score, the service most likely responsible, a concrete suggested fix, and an estimated minutes-to-recovery. Only reference facts present in the alert timeline — never invent services, deploys, or metrics not given.",
    schema: rootCauseOutputSchema,
    schemaDescription:
      '{ "hypothesis": string, "confidence": number, "culpritService": string, "suggestedFix": string, "estimatedRecoveryMinutes": number }',
    messages: [{ role: "user", content: context }],
  });

  const db = getIncidentTriageDb();
  const record = await db.rootCauseAnalysis.upsert({
    where: { incidentId: params.incidentId },
    create: {
      organizationId: params.organizationId,
      incidentId: params.incidentId,
      hypothesis: response.data.hypothesis,
      confidence: response.data.confidence,
      culpritService: response.data.culpritService,
      suggestedFix: response.data.suggestedFix,
      estimatedRecoveryMinutes: response.data.estimatedRecoveryMinutes,
    },
    update: {
      hypothesis: response.data.hypothesis,
      confidence: response.data.confidence,
      culpritService: response.data.culpritService,
      suggestedFix: response.data.suggestedFix,
      estimatedRecoveryMinutes: response.data.estimatedRecoveryMinutes,
      generatedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "incidenttriage.root_cause_generated", properties: { incidentId: params.incidentId } },
    (err) => captureError(err, { feature: "incidenttriage.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "root_cause_analysis",
    title: "Root cause analysis ready",
    body: `AI analysis complete for "${incident.title}".`,
    channels: [],
  });

  return record;
}
