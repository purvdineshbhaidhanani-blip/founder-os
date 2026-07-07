import type { LogFields, LogLevel } from "./types.js";

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface StructuredLogger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(scope: string): StructuredLogger;
}

export interface JsonConsoleLoggerOptions {
  scope: string;
  minLevel?: LogLevel;
  /** Injectable sink, defaults to console methods. Lets callers redirect logs (files, log shippers, tests). */
  sink?: (level: LogLevel, line: string) => void;
}

function defaultSink(level: LogLevel, line: string): void {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * JSON-structured logger with zero external dependencies. Every entry is a
 * single JSON line (`timestamp`, `level`, `scope`, `message`, plus arbitrary
 * fields), which is what most log aggregators expect out of the box.
 */
export class JsonConsoleLogger implements StructuredLogger {
  private readonly minLevel: LogLevel;
  private readonly sink: (level: LogLevel, line: string) => void;

  constructor(private readonly options: JsonConsoleLoggerOptions) {
    this.minLevel = options.minLevel ?? "info";
    this.sink = options.sink ?? defaultSink;
  }

  private write(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[this.minLevel]) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      scope: this.options.scope,
      message,
      ...fields,
    };
    this.sink(level, JSON.stringify(entry));
  }

  debug(message: string, fields?: LogFields): void {
    this.write("debug", message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.write("info", message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.write("warn", message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.write("error", message, fields);
  }

  child(scope: string): StructuredLogger {
    return new JsonConsoleLogger({
      scope: `${this.options.scope}:${scope}`,
      minLevel: this.minLevel,
      sink: this.sink,
    });
  }
}
