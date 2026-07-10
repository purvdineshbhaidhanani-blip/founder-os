import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { withinLimit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { getCRMCaptureDb } from "../db.js";
import { normalizeEmail, normalizePhone } from "./dedup-engine.js";
import type { z as zType } from "zod";
import type { extractContactSchema } from "../validation/contacts.js";

type ExtractContactInput = zType.infer<typeof extractContactSchema>;

const extractedContactSchema = z.object({
  firstName: z.string(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
});

/**
 * AI Lead Extraction per products/crmcapture/docs/PRODUCT_IDENTITY.md
 * §7 "Contact enrichment" and §21 "AI Lead Extraction" (Starter tier) —
 * parses raw text (an email signature, a pasted web-form submission)
 * into structured contact fields and immediately creates the Contact,
 * eliminating the manual data-entry step §2 identifies as the core problem.
 */
export async function extractContactFromText(params: { organizationId: string; input: ExtractContactInput }) {
  const db = getCRMCaptureDb();
  const limitCheck = await withinLimit(params.organizationId, "contacts");
  const currentCount = await db.contact.count({ where: { organizationId: params.organizationId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} contacts. Upgrade your plan to add more.`);
  }

  const response = await completeStructured({
    feature: "crmcapture.lead_extraction",
    organizationId: params.organizationId,
    system:
      "You extract contact information from raw text (an email, a web form submission, a signature block). Return the person's first name, last name, email, phone, company, and job title. Use null for any field not present in the text. Never invent information not present in the input.",
    schema: extractedContactSchema,
    schemaDescription: '{ "firstName": string, "lastName": string|null, "email": string|null, "phone": string|null, "company": string|null, "jobTitle": string|null }',
    messages: [{ role: "user", content: params.input.rawText }],
  });

  return db.contact.create({
    data: {
      organizationId: params.organizationId,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      email: response.data.email,
      normalizedEmail: normalizeEmail(response.data.email),
      phone: response.data.phone,
      normalizedPhone: normalizePhone(response.data.phone),
      company: response.data.company,
      jobTitle: response.data.jobTitle,
      source: params.input.source,
    },
  });
}
