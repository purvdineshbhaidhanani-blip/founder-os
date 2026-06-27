import type { ValidationReport } from "../types/validation.js";
import { reportToString } from "../types/validation.js";

/**
 * Tiny output helpers used by every CLI command. Keeping them here means the
 * commands only know how to *do* things; they never reach for `console` or
 * `process.exit` directly, which keeps them straightforward to unit-test.
 */
export const stdout = (message: string): void => {
  process.stdout.write(message.endsWith("\n") ? message : `${message}\n`);
};

export const stderr = (message: string): void => {
  process.stderr.write(message.endsWith("\n") ? message : `${message}\n`);
};

export function printReport(report: ValidationReport): void {
  if (report.issues.length === 0) {
    stdout("No issues found.");
    return;
  }
  for (const issue of report.issues) {
    const target = report.valid && issue.severity === "warning" ? stdout : stderr;
    target(
      `[${issue.severity.toUpperCase()}] ${issue.code}${issue.path ? ` (${issue.path})` : ""}: ${issue.message}`,
    );
  }
  if (!report.valid) {
    stderr(reportToString(report));
  }
}

export function failWith(report: ValidationReport): never {
  printReport(report);
  process.exitCode = 1;
  throw new CliExit();
}

export function failWithMessage(message: string): never {
  stderr(message);
  process.exitCode = 1;
  throw new CliExit();
}

export class CliExit extends Error {
  constructor() {
    super("CLI exit");
    this.name = "CliExit";
  }
}
