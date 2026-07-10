import { redact } from "./redact.js";

/**
 * Structured logging per standards/engineering.md: JSON in production,
 * pretty-printed in dev; every line carries timestamp, level,
 * service/product name, request ID (when present), and a machine-parseable
 * `event` field.
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

const LEVEL_WEIGHT: Record<LogLevel, number> = { error: 0, warn: 1, info: 2, debug: 3 };

export interface LogFields {
  event: string;
  requestId?: string;
  organizationId?: string;
  userId?: string;
  [key: string]: unknown;
}

export interface LoggerOptions {
  /** Product/service name stamped on every line, e.g. "spendgov-api". */
  service: string;
  /** Minimum level to emit; defaults to "debug" outside production. */
  level?: LogLevel;
  /** Override for testing — defaults to process.env.NODE_ENV === "production". */
  isProduction?: boolean;
  /** Override the sink for testing; defaults to console. */
  write?: (line: string) => void;
}

export interface Logger {
  error(fields: LogFields, err?: unknown): void;
  warn(fields: LogFields): void;
  info(fields: LogFields): void;
  debug(fields: LogFields): void;
  /** Returns a child logger with fields merged into every subsequent call — for per-request context. */
  child(context: Partial<LogFields>): Logger;
}

export function createLogger(options: LoggerOptions): Logger {
  const isProduction = options.isProduction ?? process.env.NODE_ENV === "production";
  const minLevel = options.level ?? (isProduction ? "info" : "debug");
  const write = options.write ?? ((line: string) => process.stdout.write(line + "\n"));

  function shouldLog(level: LogLevel): boolean {
    return LEVEL_WEIGHT[level] <= LEVEL_WEIGHT[minLevel];
  }

  function emit(level: LogLevel, fields: LogFields, baseContext: Partial<LogFields>, err?: unknown): void {
    if (!shouldLog(level)) return;

    const record = {
      timestamp: new Date().toISOString(),
      level,
      service: options.service,
      ...(redact(baseContext) as Record<string, unknown>),
      ...(redact(fields) as Record<string, unknown>),
      ...(err ? { error: serializeError(err) } : {}),
    };

    if (isProduction) {
      write(JSON.stringify(record));
    } else {
      const { timestamp, level: lvl, service, event, ...rest } = record as Record<string, unknown>;
      write(`[${timestamp}] ${String(lvl).toUpperCase()} ${service} ${event} ${JSON.stringify(rest)}`);
    }
  }

  function build(baseContext: Partial<LogFields>): Logger {
    return {
      error: (fields, err) => emit("error", fields, baseContext, err),
      warn: (fields) => emit("warn", fields, baseContext),
      info: (fields) => emit("info", fields, baseContext),
      debug: (fields) => emit("debug", fields, baseContext),
      child: (context) => build({ ...baseContext, ...context }),
    };
  }

  return build({});
}

function serializeError(err: unknown): { message: string; name?: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, name: err.name, stack: err.stack };
  }
  return { message: String(err) };
}
