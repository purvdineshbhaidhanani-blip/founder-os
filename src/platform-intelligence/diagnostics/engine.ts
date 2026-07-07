import { DEFAULT_DIAGNOSTIC_CHECKS } from "./checks.js";
import type { DiagnosticCheck, DiagnosticContext, DiagnosticReport } from "./types.js";

export interface DiagnosticsEngineOptions {
  checks?: DiagnosticCheck[];
}

/**
 * Runs a pluggable set of diagnostic checks (missing configuration, broken
 * dependencies, invalid modules, performance warnings, or any custom check
 * registered later) against a context and returns a flat, severity-tagged
 * report.
 */
export class DiagnosticsEngine {
  private readonly checks: DiagnosticCheck[];

  constructor(options: DiagnosticsEngineOptions = {}) {
    this.checks = options.checks ?? [...DEFAULT_DIAGNOSTIC_CHECKS];
  }

  registerCheck(check: DiagnosticCheck): void {
    this.checks.push(check);
  }

  async run(context: DiagnosticContext): Promise<DiagnosticReport> {
    const results = await Promise.all(this.checks.map((check) => check(context)));
    return { issues: results.flat(), generatedAt: new Date().toISOString() };
  }
}
