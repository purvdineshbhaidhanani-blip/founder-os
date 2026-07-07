/**
 * @platform/core — the foundational package every other platform package can
 * depend on, with zero dependencies of its own. Deliberately minimal: a
 * structured logger, nothing else, added because @platform/identity needed
 * one and reaching into the consuming application's own logger (or into a
 * whole platform engine just for logging) would be a backwards dependency.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

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

function resolveLevel(env: Record<string, string | undefined>): LogLevel {
  const raw = env.PLATFORM_LOG_LEVEL?.toLowerCase();
  if (raw && raw in LEVEL_WEIGHT) return raw as LogLevel;
  return "info";
}

function resolveFormat(env: Record<string, string | undefined>): "text" | "json" {
  return env.PLATFORM_LOG_FORMAT?.toLowerCase() === "json" ? "json" : "text";
}

function write(scope: string, level: LogLevel, message: string, fields?: LogFields): void {
  const env = typeof process !== "undefined" ? process.env : {};
  const configured = resolveLevel(env);
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configured]) return;

  const timestamp = new Date().toISOString();

  if (resolveFormat(env) === "json") {
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

/** Creates a scoped logger. Level/format are controlled by `PLATFORM_LOG_LEVEL`/`PLATFORM_LOG_FORMAT`. */
export function createLogger(scope: string): Logger {
  return {
    debug: (message, fields) => write(scope, "debug", message, fields),
    info: (message, fields) => write(scope, "info", message, fields),
    warn: (message, fields) => write(scope, "warn", message, fields),
    error: (message, fields) => write(scope, "error", message, fields),
    child: (childScope: string) => createLogger(`${scope}:${childScope}`),
  };
}
