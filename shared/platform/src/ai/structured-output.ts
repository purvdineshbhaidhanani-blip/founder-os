import type { z } from "zod";
import { routeCompletion } from "./router.js";
import type { StructuredCompletionRequest, StructuredCompletionResponse } from "./types.js";

const MAX_CORRECTION_ATTEMPTS = 2;

/** Pure, independently testable — strips optional markdown fences before parsing. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  return JSON.parse(candidate!.trim());
}

/** Pure, independently testable — parses + validates without any network call. */
export function parseStructuredResponse<S extends z.ZodTypeAny>(content: string, schema: S): z.infer<S> {
  return schema.parse(extractJson(content));
}

/**
 * Structured output per standards/ai.md: every AI JSON response is
 * validated against a zod schema before the caller sees it — a model that
 * "usually" returns the right shape is not good enough for product code
 * that trusts the result's type.
 */
export async function completeStructured<S extends z.ZodTypeAny>(
  request: StructuredCompletionRequest<S>,
): Promise<StructuredCompletionResponse<S>> {
  const instructions = `${request.system ?? ""}\n\nRespond with ONLY a JSON object matching this shape (no prose, no markdown fences): ${request.schemaDescription}`;

  let lastResponse: Awaited<ReturnType<typeof routeCompletion>> | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_CORRECTION_ATTEMPTS; attempt++) {
    const messages =
      attempt === 1
        ? request.messages
        : [
            ...request.messages,
            { role: "assistant" as const, content: lastResponse?.content ?? "" },
            {
              role: "user" as const,
              content: `That response was not valid JSON matching the required shape (${String(lastError)}). Return ONLY the corrected JSON object.`,
            },
          ];

    lastResponse = await routeCompletion({ ...request, system: instructions, messages });

    try {
      const parsed = request.schema.parse(extractJson(lastResponse.content));
      const { content: _content, ...rest } = lastResponse;
      return { ...rest, data: parsed };
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `AI response did not match the expected schema after ${MAX_CORRECTION_ATTEMPTS} attempts: ${String(lastError)}`,
  );
}
