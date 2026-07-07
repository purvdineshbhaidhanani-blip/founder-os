import type { ConfigValidationResultLike, ModuleRegistryLike } from "../product-intelligence/types.js";

export const DIAGNOSTIC_CATEGORIES = [
  "missing-configuration",
  "broken-dependencies",
  "invalid-modules",
  "performance",
] as const;
export type DiagnosticCategory = (typeof DIAGNOSTIC_CATEGORIES)[number];

export type DiagnosticSeverity = "info" | "warning" | "critical";

export interface DiagnosticIssue {
  id: string;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  message: string;
  path?: string;
}

export interface DiagnosticReport {
  issues: DiagnosticIssue[];
  generatedAt: string;
}

export interface PerformanceSignal {
  label: string;
  value: number;
  warnAbove?: number;
  criticalAbove?: number;
}

export interface DiagnosticContext {
  moduleRegistry?: ModuleRegistryLike;
  configValidation?: ConfigValidationResultLike;
  performanceSignals?: PerformanceSignal[];
}

export type DiagnosticCheck = (context: DiagnosticContext) => DiagnosticIssue[] | Promise<DiagnosticIssue[]>;
