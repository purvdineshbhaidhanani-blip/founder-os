import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getCRMCaptureDb } from "../db.js";
import { getLead } from "./leads-repo.js";

const salesAssistantOutputSchema = z.object({
  summary: z.string().describe("A short summary of who this lead is and where they stand."),
  nextStepSuggestion: z.string().describe("The single highest-leverage next action to move this lead forward."),
  draftEmail: z.string().describe("A ready-to-send follow-up email drafted for this lead."),
  opportunityDetected: z.boolean().describe("True if this lead shows strong buying signals (high score, senior title, engaged) worth flagging as a sales opportunity."),
});

/**
 * AI Sales Assistant — the Killer Feature per
 * products/crmcapture/docs/PRODUCT_IDENTITY.md §5: "creates CRM records,
 * updates opportunities, suggests next follow-up, and generates
 * follow-up emails" combined into a single AI call per lead, gated
 * behind the Pro-tier `use_ai_followup_email` /
 * `use_ai_opportunity_detection` entitlements.
 */
export async function generateSalesAssistantSuggestion(params: { organizationId: string; leadId: string; requestedByUserId: string }) {
  const lead = await getLead({ organizationId: params.organizationId, leadId: params.leadId });
  if (!lead) {
    throw new Error("Lead not found");
  }

  const context = [
    `Lead: ${lead.contact.firstName} ${lead.contact.lastName ?? ""} (score: ${lead.score}, status: ${lead.status})`,
    `Company: ${lead.contact.company ?? "unknown"}`,
    `Job title: ${lead.contact.jobTitle ?? "unknown"}`,
    `Source: ${lead.source}`,
    `Notes: ${lead.notes ?? "none"}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "crmcapture.sales_assistant",
    organizationId: params.organizationId,
    system:
      "You are a sales assistant. Given a CRM lead's details, write a brief summary, suggest the single best next step, draft a ready-to-send follow-up email, and flag whether this lead shows strong buying signals worth treating as an opportunity. Only reference facts present in the input — never invent company details, dates, or commitments not given.",
    schema: salesAssistantOutputSchema,
    schemaDescription: '{ "summary": string, "nextStepSuggestion": string, "draftEmail": string, "opportunityDetected": boolean }',
    messages: [{ role: "user", content: context }],
  });

  const db = getCRMCaptureDb();
  const record = await db.followUpSuggestion.upsert({
    where: { leadId: params.leadId },
    create: {
      organizationId: params.organizationId,
      leadId: params.leadId,
      summary: response.data.summary,
      nextStepSuggestion: response.data.nextStepSuggestion,
      draftEmail: response.data.draftEmail,
      opportunityDetected: response.data.opportunityDetected,
    },
    update: {
      summary: response.data.summary,
      nextStepSuggestion: response.data.nextStepSuggestion,
      draftEmail: response.data.draftEmail,
      opportunityDetected: response.data.opportunityDetected,
      generatedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "crmcapture.sales_assistant_generated", properties: { leadId: params.leadId } },
    (err) => captureError(err, { feature: "crmcapture.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "sales_assistant",
    title: "AI Sales Assistant suggestion ready",
    body: `A follow-up suggestion is ready for ${lead.contact.firstName} ${lead.contact.lastName ?? ""}.`,
    channels: [],
  });

  return record;
}
