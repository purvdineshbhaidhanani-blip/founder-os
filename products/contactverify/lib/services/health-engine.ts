import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getContactVerifyDb } from "../db.js";
import { getContact, findAllDuplicateGroups } from "./contacts-repo.js";

const healthProfileOutputSchema = z.object({
  leadQuality: z.enum(["high", "medium", "low"]).describe("Overall lead quality given the available signal."),
  missingFields: z.array(z.string()).max(10).describe("Fields that are missing and would improve usability if filled in."),
  suggestedEnrichment: z.array(z.string()).max(10).describe("Concrete suggestions for enriching this contact record."),
  confidenceScore: z.number().int().min(0).max(100).describe("Confidence in this assessment given the available data."),
  explanation: z.string().describe("Plain-language summary of this contact's health and why."),
});

/**
 * AI Contact Health Engine — the Killer Feature per
 * products/contactverify/docs/PRODUCT_IDENTITY.md §5: "gives a complete
 * health profile — email validity, phone validity, duplicate
 * probability, missing fields, lead quality, suggested enrichment, and
 * a confidence score." The deterministic email/phone/dedup engines
 * already decide validity and duplicate status; this call only adds
 * the qualitative lead-quality and enrichment layer on top.
 */
export async function generateHealthProfile(params: { organizationId: string; contactId: string; requestedByUserId: string }) {
  const contact = await getContact({ organizationId: params.organizationId, contactId: params.contactId });
  if (!contact) {
    throw new Error("Contact not found");
  }

  const duplicateGroups = await findAllDuplicateGroups(params.organizationId);
  const isDuplicate = duplicateGroups.some((g) => g.contactIds.includes(contact.id));

  const context = [
    `Contact: ${contact.firstName} ${contact.lastName ?? ""}`,
    `Email: ${contact.email ?? "none"} (status: ${contact.emailStatus})`,
    `Phone: ${contact.phone ?? "none"} (status: ${contact.phoneStatus})`,
    `Company: ${contact.company ?? "none"}`,
    `Job title: ${contact.jobTitle ?? "none"}`,
    `Likely duplicate of another contact: ${isDuplicate ? "yes" : "no"}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "contactverify.health_engine",
    organizationId: params.organizationId,
    system:
      "You assess CRM contact data quality. Given a contact's verification status and fields, assess overall lead quality, list missing fields, suggest concrete enrichment steps, and give a confidence score. Only reference facts present in the input — never invent company details, titles, or contact info not given.",
    schema: healthProfileOutputSchema,
    schemaDescription: '{ "leadQuality": "high"|"medium"|"low", "missingFields": string[], "suggestedEnrichment": string[], "confidenceScore": number, "explanation": string }',
    messages: [{ role: "user", content: context }],
  });

  const db = getContactVerifyDb();
  const record = await db.contactHealthProfile.upsert({
    where: { contactId: params.contactId },
    create: {
      organizationId: params.organizationId,
      contactId: params.contactId,
      leadQuality: response.data.leadQuality,
      missingFields: response.data.missingFields,
      suggestedEnrichment: response.data.suggestedEnrichment,
      confidenceScore: response.data.confidenceScore,
      explanation: response.data.explanation,
    },
    update: {
      leadQuality: response.data.leadQuality,
      missingFields: response.data.missingFields,
      suggestedEnrichment: response.data.suggestedEnrichment,
      confidenceScore: response.data.confidenceScore,
      explanation: response.data.explanation,
      generatedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "contactverify.health_profile_generated", properties: { contactId: params.contactId } },
    (err) => captureError(err, { feature: "contactverify.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "health_profile",
    title: "Contact health profile ready",
    body: `AI health profile generated for ${contact.firstName} ${contact.lastName ?? ""}.`,
    channels: [],
  });

  return record;
}
