import { z } from "zod";
import { completeStructured } from "@founder-os/platform/ai";
import { createNotification } from "@founder-os/platform/notifications";
import { trackEventAsync } from "@founder-os/platform/analytics";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";
import { getPayrollAuditDb } from "../db.js";
import { getPayrollRun } from "./payroll-runs-repo.js";

const copilotOutputSchema = z.object({
  summary: z.string().describe("Plain-language, 2-4 sentence summary of what's wrong across this payroll run and why it matters before disbursement."),
  recommendedFixes: z.array(z.string()).max(10).describe("Concrete, prioritized fixes a payroll reviewer should apply before this run is disbursed."),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).describe("Overall pre-disbursement risk level for this payroll run given its findings."),
});

/**
 * AI Payroll Copilot — the Killer Feature per
 * products/payrollaudit/docs/PRODUCT_IDENTITY.md §5: "Before payroll is
 * processed, AI automatically detects incorrect salary calculations, tax
 * issues, missing attendance, compliance violations, duplicate payments,
 * and suspicious payroll changes — and recommends fixes before employees
 * are paid, not after." Explains the deterministic engine's findings in
 * plain language rather than re-deriving them, per this portfolio's
 * "explain, don't just flag" AI philosophy (§28).
 */
export async function generatePayrollCopilotBrief(params: { organizationId: string; payrollRunId: string; requestedByUserId: string }) {
  const payrollRun = await getPayrollRun({ organizationId: params.organizationId, payrollRunId: params.payrollRunId });
  if (!payrollRun) {
    throw new PlatformError("NOT_FOUND", "Payroll run not found.");
  }

  const findingsText =
    payrollRun.findings.length === 0
      ? "No findings — every payslip line reconciled against expected salary, tax, and attendance calculations."
      : payrollRun.findings
          .map((f) => `- [${f.severity}] ${f.employee.fullName} (${f.employee.employeeCode}): ${f.title} — ${f.description}`)
          .join("\n");

  const context = [
    `Company: ${payrollRun.company.name}`,
    `Pay period: ${payrollRun.periodStart.toISOString().slice(0, 10)} to ${payrollRun.periodEnd.toISOString().slice(0, 10)}`,
    `Payslip lines: ${payrollRun.payslipLines.length}`,
    `Rule-based compliance score: ${payrollRun.complianceScore}/100`,
    `Findings:\n${findingsText}`,
  ].join("\n");

  const response = await completeStructured({
    feature: "payrollaudit.payroll_copilot",
    organizationId: params.organizationId,
    system:
      "You are a payroll compliance reviewer. Given a payroll run's rule-based findings, write a short plain-language summary of what's wrong and why it matters, a prioritized list of concrete fixes to apply before disbursement, and an overall pre-disbursement risk level. Only reference facts present in the findings — never invent employees, amounts, or issues not given.",
    schema: copilotOutputSchema,
    schemaDescription: '{ "summary": string, "recommendedFixes": string[], "riskLevel": "low"|"medium"|"high"|"critical" }',
    messages: [{ role: "user", content: context }],
  });

  const db = getPayrollAuditDb();
  const updated = await db.payrollRun.update({
    where: { id: payrollRun.id },
    data: {
      copilotSummary: response.data.summary,
      copilotRecommendedFixes: response.data.recommendedFixes,
      copilotRiskLevel: response.data.riskLevel,
      copilotGeneratedAt: new Date(),
    },
  });

  trackEventAsync(
    { organizationId: params.organizationId, userId: params.requestedByUserId, eventName: "payrollaudit.copilot_brief_generated", properties: { payrollRunId: params.payrollRunId } },
    (err) => captureError(err, { feature: "payrollaudit.analytics" }),
  );

  await createNotification({
    userId: params.requestedByUserId,
    organizationId: params.organizationId,
    category: "payroll_copilot_brief",
    title: "AI Payroll Copilot brief ready",
    body: `Copilot analysis complete for ${payrollRun.company.name}'s ${payrollRun.periodStart.toISOString().slice(0, 10)} payroll run — risk level: ${response.data.riskLevel}.`,
    channels: [],
  });

  return updated;
}
