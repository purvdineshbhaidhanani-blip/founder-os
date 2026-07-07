import type { ErrorReport } from "./types.js";

export interface ErrorReporter {
  report(error: Error | string, context?: Record<string, unknown>): ErrorReport;
}

let counter = 0;
function generateErrorId(): string {
  counter += 1;
  return `err_${Date.now()}_${counter}`;
}

function toReport(error: Error | string, context?: Record<string, unknown>): ErrorReport {
  return {
    id: generateErrorId(),
    message: typeof error === "string" ? error : error.message,
    stack: typeof error === "string" ? undefined : error.stack,
    context,
    timestamp: new Date().toISOString(),
  };
}

/** Logs errors to the console. Safe default; wrap or replace with a Sentry/Bugsnag-style adapter in production. */
export class ConsoleErrorReporter implements ErrorReporter {
  report(error: Error | string, context?: Record<string, unknown>): ErrorReport {
    const report = toReport(error, context);
    console.error(JSON.stringify(report));
    return report;
  }
}

/** Fans a single report out to multiple reporters (e.g. console + external service) without callers knowing about either. */
export class CompositeErrorReporter implements ErrorReporter {
  constructor(private readonly reporters: ErrorReporter[]) {}

  report(error: Error | string, context?: Record<string, unknown>): ErrorReport {
    const reports = this.reporters.map((reporter) => reporter.report(error, context));
    return reports[0] ?? toReport(error, context);
  }
}

/** Buffers reports in memory — useful for tests and local inspection. */
export class InMemoryErrorReporter implements ErrorReporter {
  private readonly reports: ErrorReport[] = [];

  report(error: Error | string, context?: Record<string, unknown>): ErrorReport {
    const report = toReport(error, context);
    this.reports.push(report);
    return report;
  }

  all(): ErrorReport[] {
    return [...this.reports];
  }
}
