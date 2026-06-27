/**
 * Minimal structured logger for the Agent Factory CLI and library code.
 *
 * Design goals:
 *  - Zero dependencies (the factory should stay lightweight).
 *  - Leveled output, controllable via AGENT_FACTORY_LOG_LEVEL env var.
 *  - Machine-readable mode (AGENT_FACTORY_LOG_FORMAT=json) for CI pipelines.
 *  - Every entry is scoped to the module that produced it for traceability.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function resolveLevel(): LogLevel {
  const raw = process.env.AGENT_FACTORY_LOG_LEVEL?.toLowerCase();
  if (raw && raw in LEVEL_WEIGHT) return raw as LogLevel;
  return "info";
}

function resolveFormat(): "text" | "json" {
  return process.env.AGENT_FACTORY_LOG_FORMAT?.toLowerCase() === "json" ? "json" : "text";
}

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(scope: string): Logger;
}

function write(scope: string, level: LogLevel, message: string, fields?: LogFields): void {
  const configured = resolveLevel();
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configured]) return;

  const timestamp = new Date().toISOString();

  if (resolveFormat() === "json") {
    const line = JSON.stringify({ timestamp, level, scope, message, ...fields });
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
    return;
  }

  const suffix = fields && Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : "";
  const line = `[${timestamp}] [${level.toUpperCase()}] [${scope}] ${message}${suffix}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, fields) => write(scope, "debug", message, fields),
    info: (message, fields) => write(scope, "info", message, fields),
    warn: (message, fields) => write(scope, "warn", message, fields),
    error: (message, fields) => write(scope, "error", message, fields),
    child: (childScope: string) => createLogger(`${scope}:${childScope}`),
  };
}

export const rootLogger = createLogger("agent-factory");
