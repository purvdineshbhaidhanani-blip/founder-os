import type { DiagnosticContext, DiagnosticIssue } from "./types.js";

let counter = 0;
function generateIssueId(): string {
  counter += 1;
  return `diag_${Date.now()}_${counter}`;
}

/** Flags each configuration validation issue (missing/invalid env vars, deployment config, etc.) as a diagnostic. */
export function checkMissingConfiguration(context: DiagnosticContext): DiagnosticIssue[] {
  if (!context.configValidation || context.configValidation.valid) return [];
  return (context.configValidation.issues ?? []).map((issue) => ({
    id: generateIssueId(),
    category: "missing-configuration",
    severity: "critical",
    message: issue.message,
    path: issue.path,
  }));
}

/** Flags cycles and missing dependencies (critical) and enabled-but-not-satisfied dependencies (warning). */
export function checkBrokenDependencies(context: DiagnosticContext): DiagnosticIssue[] {
  if (!context.moduleRegistry) return [];
  const validation = context.moduleRegistry.validateAll();
  return validation.issues.map((issue) => ({
    id: generateIssueId(),
    category: "broken-dependencies",
    severity: "critical",
    message: issue.detail,
    path: issue.nodeId,
  }));
}

/** Flags modules present on disk/registered but never catalogued — worth a human look before relying on them. */
export function checkInvalidModules(context: DiagnosticContext): DiagnosticIssue[] {
  if (!context.moduleRegistry) return [];
  return context.moduleRegistry
    .list()
    .filter((module) => module.discovered)
    .map((module) => ({
      id: generateIssueId(),
      category: "invalid-modules",
      severity: "warning",
      message: `Module "${module.id}" was auto-discovered but is not in the built-in catalog. Verify it before enabling it.`,
      path: module.id,
    }));
}

/** Flags performance signals (queue depth, latency, enabled-module count, whatever the caller supplies) that cross configured thresholds. */
export function checkPerformanceWarnings(context: DiagnosticContext): DiagnosticIssue[] {
  return (context.performanceSignals ?? []).flatMap((signal): DiagnosticIssue[] => {
    if (signal.criticalAbove !== undefined && signal.value >= signal.criticalAbove) {
      return [
        {
          id: generateIssueId(),
          category: "performance",
          severity: "critical",
          message: `${signal.label} is ${signal.value}, at or above the critical threshold of ${signal.criticalAbove}.`,
          path: signal.label,
        },
      ];
    }
    if (signal.warnAbove !== undefined && signal.value >= signal.warnAbove) {
      return [
        {
          id: generateIssueId(),
          category: "performance",
          severity: "warning",
          message: `${signal.label} is ${signal.value}, at or above the warning threshold of ${signal.warnAbove}.`,
          path: signal.label,
        },
      ];
    }
    return [];
  });
}

export const DEFAULT_DIAGNOSTIC_CHECKS = [
  checkMissingConfiguration,
  checkBrokenDependencies,
  checkInvalidModules,
  checkPerformanceWarnings,
];
