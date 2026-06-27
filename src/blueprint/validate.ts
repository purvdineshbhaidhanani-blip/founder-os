import { ZodError } from "zod";
import { AgentBlueprintSchema, type AgentBlueprint } from "../types/blueprint.js";
import type { ValidationIssue, ValidationReport } from "../types/validation.js";
import { mergeReports } from "../types/validation.js";
import { err, ok, type Result } from "../utils/result.js";
import { validateBlueprintSemantics } from "./semantics.js";

function zodErrorToReport(error: ZodError): ValidationReport {
  const issues: ValidationIssue[] = error.issues.map((issue) => ({
    code: `SCHEMA_${issue.code.toUpperCase()}`,
    severity: "error",
    message: issue.message,
    path: issue.path.join("."),
  }));
  return { valid: false, issues };
}

/**
 * Validates an arbitrary (untrusted) value against the full blueprint
 * contract: shape (Zod) first, then cross-field semantics. Shape errors
 * short-circuit — there's no point running semantic checks against a value
 * that doesn't even have the right fields.
 */
export function validateBlueprint(raw: unknown): Result<AgentBlueprint, ValidationReport> {
  const parsed = AgentBlueprintSchema.safeParse(raw);
  if (!parsed.success) {
    return err(zodErrorToReport(parsed.error));
  }

  const semanticReport = validateBlueprintSemantics(parsed.data);
  if (!semanticReport.valid) {
    return err(semanticReport);
  }

  return ok(parsed.data);
}

/**
 * Same as `validateBlueprint`, but always returns the merged report (shape +
 * semantics) even on success, so warnings surface to callers that want them.
 */
export function validateBlueprintWithWarnings(
  raw: unknown,
): Result<{ blueprint: AgentBlueprint; report: ValidationReport }, ValidationReport> {
  const parsed = AgentBlueprintSchema.safeParse(raw);
  if (!parsed.success) {
    return err(zodErrorToReport(parsed.error));
  }

  const semanticReport = validateBlueprintSemantics(parsed.data);
  if (!semanticReport.valid) {
    return err(semanticReport);
  }

  return ok({ blueprint: parsed.data, report: mergeReports(semanticReport) });
}
