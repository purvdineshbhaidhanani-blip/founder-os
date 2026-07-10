import type { z } from "zod";
import { validationError } from "../errors/index.js";

/**
 * Validate-at-the-boundary helper per standards/engineering.md /
 * standards/api.md: every request body/query/params is validated against a
 * zod schema before business logic runs; failures return the standard
 * VALIDATION_ERROR shape with per-field details, never a hand-rolled
 * `if (!x) throw`.
 */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join(".") || "(root)",
      issue: issue.message,
    }));
    throw validationError(details);
  }
  return result.data;
}

/** Convenience for `?query=params` objects, which arrive as URLSearchParams. */
export function parseSearchParamsOrThrow<S extends z.ZodTypeAny>(schema: S, params: URLSearchParams): z.infer<S> {
  return parseOrThrow(schema, Object.fromEntries(params.entries()));
}

export async function parseJsonBodyOrThrow<S extends z.ZodTypeAny>(schema: S, request: Request): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw validationError([{ field: "(body)", issue: "Request body must be valid JSON." }]);
  }
  return parseOrThrow(schema, raw);
}
