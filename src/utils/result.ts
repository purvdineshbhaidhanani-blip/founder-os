/**
 * A `Result<T, E>` represents an operation that can fail without throwing.
 * Used throughout the factory (blueprint validation, agent validation,
 * registry writes) so callers are forced to handle the failure path instead
 * of relying on try/catch control flow for expected, recoverable errors.
 */
export type Result<T, E = string[]> = { ok: true; value: T } | { ok: false; errors: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(errors: E): Result<never, E> {
  return { ok: false, errors };
}

export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; errors: E } {
  return !result.ok;
}

/** Unwraps a Result, throwing if it failed. Intended for CLI entrypoints, not library code. */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw new Error(`Unwrap failed on error result: ${JSON.stringify(result.errors)}`);
}
