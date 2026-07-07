import type { AITextGenerator } from "../shared/ai-text-generator.js";
import type { RecommendationContext, RecommendationDraft, RecommendationFactor, RecommendationSource } from "./types.js";

export interface AIRecommendationSourceOptions {
  id?: string;
  generator: AITextGenerator;
  /** Builds the prompt sent to the generator. Defaults to a generic JSON-recommendation prompt. */
  buildPrompt?: (context: RecommendationContext) => string;
}

function defaultPrompt(context: RecommendationContext): string {
  return [
    "You are a product recommendation assistant.",
    "Given the following context:",
    JSON.stringify(context, null, 2),
    "",
    'Respond with a JSON array only. Each element must have "title" (string), "description" (string),',
    'and "factors" (array of { "label": string, "detail": string, "weight": number between 0 and 1 }).',
  ].join("\n");
}

function isFactor(value: unknown): value is RecommendationFactor {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.label === "string" && typeof candidate.detail === "string" && typeof candidate.weight === "number";
}

function extractJsonArray(raw: string): string {
  const match = raw.match(/\[[\s\S]*\]/);
  return match ? match[0] : raw;
}

/** Parses the generator's free-text response into drafts, falling back to a single unstructured draft if it isn't valid JSON. */
function parseDrafts(raw: string): RecommendationDraft[] {
  try {
    const parsed: unknown = JSON.parse(extractJsonArray(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is { title: string; description: string; factors?: unknown } =>
          !!item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).title === "string" &&
          typeof (item as Record<string, unknown>).description === "string",
      )
      .map((item) => ({
        title: item.title,
        description: item.description,
        factors: Array.isArray(item.factors) ? item.factors.filter(isFactor) : [],
      }));
  } catch {
    return raw.trim() ? [{ title: "AI recommendation", description: raw.trim(), factors: [] }] : [];
  }
}

/**
 * Recommendation source backed by any `AITextGenerator` — no provider is
 * hardcoded. Works with `TemplateAITextGenerator` (no AI at all) or a real
 * model bridged in via `ai-layer/adapter.ts`.
 */
export class AIRecommendationSource implements RecommendationSource {
  readonly type = "ai" as const;
  readonly id: string;

  constructor(private readonly options: AIRecommendationSourceOptions) {
    this.id = options.id ?? "ai-powered";
  }

  async generate(context: RecommendationContext): Promise<RecommendationDraft[]> {
    const prompt = (this.options.buildPrompt ?? defaultPrompt)(context);
    const raw = await this.options.generator.generate(prompt);
    return parseDrafts(raw);
  }
}
