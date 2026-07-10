import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { getSpendGovDb } from "../db.js";

const contractExtractionOutputSchema = z.object({
  vendorName: z.string().nullable(),
  renewalDate: z.string().nullable().describe("ISO 8601 date, or null if not stated"),
  autoRenews: z.boolean().nullable(),
  noticePeriodDays: z.number().int().nullable(),
  annualValueCents: z.number().int().nullable(),
  keyTerms: z.array(z.string()).max(10),
});

/**
 * Contract parsing per products/spendgov/docs/PRODUCT_IDENTITY.md §18
 * "Contract parsing (extract key terms from PDFs)" and §28 item 3. Scoped
 * to pasted/extracted contract text rather than PDF upload+OCR in this
 * pass — SH-STORAGE handles the file, but binary PDF text extraction is a
 * distinct capability this repo doesn't yet have a shared module for; the
 * AI extraction step itself (the hard, differentiated part) is fully real.
 */
export async function extractContractTerms(params: {
  organizationId: string;
  subscriptionId?: string;
  sourceText: string;
  extractedByUserId: string;
}) {
  const response = await completeStructured({
    feature: "spendgov.contract_extraction",
    organizationId: params.organizationId,
    system:
      "Extract key commercial terms from this SaaS/vendor contract or order form text. Only extract facts stated in the text — use null for anything not explicitly present. Do not guess or infer a renewal date from a start date unless the term length is also explicitly stated.",
    schema: contractExtractionOutputSchema,
    schemaDescription:
      '{ "vendorName": string|null, "renewalDate": string|null (ISO date), "autoRenews": boolean|null, "noticePeriodDays": number|null, "annualValueCents": number|null, "keyTerms": string[] }',
    messages: [{ role: "user", content: params.sourceText }],
  });

  const db = getSpendGovDb();
  return db.contractExtraction.create({
    data: {
      organizationId: params.organizationId,
      subscriptionId: params.subscriptionId,
      sourceText: params.sourceText,
      vendorName: response.data.vendorName,
      renewalDate: response.data.renewalDate ? new Date(response.data.renewalDate) : null,
      autoRenews: response.data.autoRenews,
      noticePeriodDays: response.data.noticePeriodDays,
      annualValueCents: response.data.annualValueCents,
      keyTerms: response.data.keyTerms,
      extractedByUserId: params.extractedByUserId,
    },
  });
}

export async function listContractExtractions(organizationId: string) {
  const db = getSpendGovDb();
  return db.contractExtraction.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}
