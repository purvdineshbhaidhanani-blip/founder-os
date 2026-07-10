import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getSecCorrelateDb } from "../db.js";
import { getAlert } from "./alerts-repo.js";

const incidentSummaryOutputSchema = z.object({
  summary: z.string(),
  rootCause: z.string(),
  recommendedActions: z.array(z.string()).max(8),
  mitreTechniqueIds: z.array(z.string()).max(10).describe("MITRE ATT&CK technique IDs, e.g. T1110 for brute force"),
});

/**
 * AI Incident Summary + Root Cause Analysis + MITRE ATT&CK Mapping per
 * products/seccorrelate/docs/PRODUCT_IDENTITY.md §5 ("Killer Feature — AI
 * Incident Graph") and §28 items 1-3. Entitlement-gated at the route
 * layer: the summary itself is available on every plan, but the deeper
 * root-cause + MITRE mapping content this same call produces is a Pro
 * feature — the route only surfaces those fields when the caller is
 * entitled, this function always computes the full analysis.
 */
export async function generateIncidentSummary(params: { organizationId: string; alertId: string; requestedByUserId: string }) {
  const alert = await getAlert({ organizationId: params.organizationId, alertId: params.alertId });
  if (!alert) {
    throw new Error("Alert not found");
  }

  const context = [
    `Alert: ${alert.title} (severity: ${alert.severity})`,
    `First event: ${alert.firstLogEvent.eventType} from ${alert.firstLogEvent.source} at ${alert.firstLogEvent.occurredAt.toISOString()}, source IP ${alert.firstLogEvent.sourceIp ?? "unknown"}, actor ${alert.firstLogEvent.actorId ?? "unknown"}.`,
    `Second event: ${alert.secondLogEvent.eventType} from ${alert.secondLogEvent.source} at ${alert.secondLogEvent.occurredAt.toISOString()}, source IP ${alert.secondLogEvent.sourceIp ?? "unknown"}, actor ${alert.secondLogEvent.actorId ?? "unknown"}.`,
    `Correlation rule: ${alert.rule?.name ?? "none"} (window ${alert.rule?.windowMinutes ?? "n/a"} minutes).`,
  ].join("\n");

  const response = await completeStructured({
    feature: "seccorrelate.incident_summary",
    organizationId: params.organizationId,
    system:
      "You are a security analyst assistant. Given two correlated security log events, write a plain-language incident summary, a root-cause explanation, a short list of recommended next actions, and any applicable MITRE ATT&CK technique IDs. Only reference facts present in the input — never invent IPs, users, or timestamps not given.",
    schema: incidentSummaryOutputSchema,
    schemaDescription:
      '{ "summary": string, "rootCause": string, "recommendedActions": string[], "mitreTechniqueIds": string[] }',
    messages: [{ role: "user", content: context }],
  });

  const db = getSecCorrelateDb();
  const record = await db.incidentSummary.upsert({
    where: { alertId: params.alertId },
    create: {
      organizationId: params.organizationId,
      alertId: params.alertId,
      summary: response.data.summary,
      rootCause: response.data.rootCause,
      recommendedActions: response.data.recommendedActions,
      mitreTechniqueIds: response.data.mitreTechniqueIds,
    },
    update: {
      summary: response.data.summary,
      rootCause: response.data.rootCause,
      recommendedActions: response.data.recommendedActions,
      mitreTechniqueIds: response.data.mitreTechniqueIds,
      generatedAt: new Date(),
    },
  });

  await db.alert.update({ where: { id: params.alertId }, data: { mitreTechniqueIds: response.data.mitreTechniqueIds } });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "seccorrelate.incident_summary_generated", properties: { alertId: params.alertId } },
    (err) => captureError(err, { feature: "seccorrelate.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "incident_summary",
    title: "Incident summary ready",
    body: `AI analysis complete for "${alert.title}".`,
    channels: [],
  });

  return record;
}
