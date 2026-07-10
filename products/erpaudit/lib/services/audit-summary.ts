import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getERPAuditDb } from "../db.js";
import { getFinding } from "./findings-repo.js";

const auditSummaryOutputSchema = z.object({
  explanation: z.string().describe("Plain-language explanation of what is wrong."),
  complianceImpact: z.string().describe("Which compliance frameworks or controls this finding puts at risk (e.g. SOX, internal controls)."),
  recommendedFix: z.string().describe("A concrete, actionable configuration or process change to resolve the finding."),
  businessImpact: z.string().describe("The business consequence if this finding is left unresolved."),
});

/**
 * AI ERP Auditor — the Killer Feature per
 * products/erpaudit/docs/PRODUCT_IDENTITY.md §5: "turning a raw
 * configuration export into an audit-ready narrative." Layers a
 * four-part audit-ready narrative on top of a rule-engine finding
 * (sod-engine.ts / config-rules.ts decide WHETHER a finding exists;
 * this only writes it up for the auditor).
 */
export async function generateAuditSummary(params: { organizationId: string; findingId: string; requestedByUserId: string }) {
  const finding = await getFinding({ organizationId: params.organizationId, findingId: params.findingId });
  if (!finding) {
    throw new Error("Finding not found");
  }

  const context = [
    `Finding: ${finding.title} (category: ${finding.category}, severity: ${finding.severity})`,
    `ERP instance: ${finding.scan.instance.name} (${finding.scan.instance.erpSystem})`,
    `Description: ${finding.description}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "erpaudit.audit_summary",
    organizationId: params.organizationId,
    system:
      "You are an ERP compliance auditor writing up a finding for an audit report. Given a configuration or segregation-of-duties finding, explain what is wrong, which compliance frameworks/controls it puts at risk, a concrete recommended fix, and the business impact if left unresolved. Only reference facts present in the input — never invent systems, users, or amounts not given.",
    schema: auditSummaryOutputSchema,
    schemaDescription: '{ "explanation": string, "complianceImpact": string, "recommendedFix": string, "businessImpact": string }',
    messages: [{ role: "user", content: context }],
  });

  const db = getERPAuditDb();
  const record = await db.auditSummary.upsert({
    where: { findingId: params.findingId },
    create: {
      organizationId: params.organizationId,
      findingId: params.findingId,
      explanation: response.data.explanation,
      complianceImpact: response.data.complianceImpact,
      recommendedFix: response.data.recommendedFix,
      businessImpact: response.data.businessImpact,
    },
    update: {
      explanation: response.data.explanation,
      complianceImpact: response.data.complianceImpact,
      recommendedFix: response.data.recommendedFix,
      businessImpact: response.data.businessImpact,
      generatedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "erpaudit.audit_summary_generated", properties: { findingId: params.findingId } },
    (err) => captureError(err, { feature: "erpaudit.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "audit_summary",
    title: "AI audit summary ready",
    body: `AI ERP Auditor analyzed "${finding.title}".`,
    channels: [],
  });

  return record;
}
