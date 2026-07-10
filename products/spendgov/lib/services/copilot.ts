import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { getSpendGovDb } from "../db.js";
import { listAllActiveSubscriptions } from "./subscriptions-repo.js";
import { listDuplicateFindings, listWasteFindings, listVendorConsolidationRecommendations } from "./findings-repo.js";
import { getUpcomingRenewals } from "./renewals.js";

const copilotActionSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  estimatedSavingsCents: z.number().int().min(0),
  effort: z.enum(["low", "medium", "high"]),
});

const copilotOutputSchema = z.object({
  summary: z.string(),
  actions: z.array(copilotActionSchema).max(10),
});

/**
 * AI CFO Copilot per products/spendgov/docs/PRODUCT_IDENTITY.md §5 ("Killer
 * Feature") and §28 item 2 — turns the org's spend findings into a ranked,
 * dollar-quantified action list. Gated behind the "use_ai_cfo_copilot"
 * entitlement (Pro+) at the route layer, not here — this function has no
 * opinion on billing.
 */
export async function generateCfoCopilotRecommendation(organizationId: string, requestedByUserId: string) {
  const [subscriptions, duplicates, waste, vendors] = await Promise.all([
    listAllActiveSubscriptions(organizationId),
    listDuplicateFindings(organizationId),
    listWasteFindings(organizationId),
    listVendorConsolidationRecommendations(organizationId),
  ]);

  const renewals = getUpcomingRenewals(
    subscriptions.map((s) => ({ id: s.id, vendorName: s.vendorName, productName: s.productName, monthlyCostCents: s.monthlyCostCents, renewalDate: s.renewalDate })),
  );

  const totalMonthlySpendCents = subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + s.monthlyCostCents, 0);

  const findingsSummary = [
    `Total active monthly spend: $${(totalMonthlySpendCents / 100).toLocaleString()}.`,
    `Duplicate tool findings: ${duplicates.map((f) => `${f.category} ($${(f.estimatedSavingsCents / 100).toLocaleString()}/mo)`).join("; ") || "none"}.`,
    `Waste findings: ${waste.map((f) => `${f.subscription.productName} — ${f.type} ($${(f.estimatedSavingsCents / 100).toLocaleString()}/mo)`).join("; ") || "none"}.`,
    `Fragmented vendor findings: ${vendors.map((f) => `${f.vendorNames.join("/")} ($${(f.estimatedSavingsCents / 100).toLocaleString()}/mo)`).join("; ") || "none"}.`,
    `Upcoming renewals (90 days): ${renewals.map((r) => `${r.vendorName} ${r.productName} in ${r.daysUntilRenewal}d`).join("; ") || "none"}.`,
  ].join("\n");

  const response = await completeStructured({
    feature: "spendgov.cfo_copilot",
    organizationId,
    system:
      "You are a CFO copilot for a SaaS + AI spend intelligence platform. Given a summary of a company's subscription findings, produce a ranked, dollar-quantified list of the highest-impact cost-saving actions. Be specific and reference the actual vendors/tools named in the input. Never invent a finding that isn't in the input.",
    schema: copilotOutputSchema,
    schemaDescription: '{ "summary": string, "actions": [{ "title": string, "rationale": string, "estimatedSavingsCents": number, "effort": "low"|"medium"|"high" }] }',
    messages: [{ role: "user", content: findingsSummary }],
  });

  const db = getSpendGovDb();
  const totalImpactCents = response.data.actions.reduce((sum, a) => sum + a.estimatedSavingsCents, 0);
  const recommendation = await db.copilotRecommendation.create({
    data: {
      organizationId,
      summary: response.data.summary,
      actions: response.data.actions,
      totalImpactCents,
    },
  });

  trackEventAsync(
    { organizationId, userId: requestedByUserId, eventName: "spendgov.cfo_copilot_generated", properties: { totalImpactCents, actionCount: response.data.actions.length } },
    (err) => captureError(err, { feature: "spendgov.analytics" }),
  );

  await createNotification({
    userId: requestedByUserId,
    organizationId,
    category: "cfo_copilot",
    title: "Your AI CFO Copilot report is ready",
    body: `${response.data.actions.length} recommended actions worth an estimated $${(totalImpactCents / 100).toLocaleString()}/mo.`,
    channels: [],
  });

  return recommendation;
}

export async function getLatestCfoCopilotRecommendation(organizationId: string) {
  const db = getSpendGovDb();
  return db.copilotRecommendation.findFirst({
    where: { organizationId },
    orderBy: { generatedAt: "desc" },
  });
}
