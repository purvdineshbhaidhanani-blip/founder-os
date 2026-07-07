import type { ZodError } from "zod";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> =
  | { valid: true; value: T }
  | { valid: false; issues: ValidationIssue[] };

export function zodIssuesToValidation(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({ path: issue.path.join(".") || "(root)", message: issue.message }));
}
