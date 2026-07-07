import { interpolate } from "../../engines/shared/interpolate.js";
import type { AITextGenerator } from "../shared/ai-text-generator.js";
import type { InsightLike, RecommendationLike } from "./types.js";

const EXPLAIN_TEMPLATE =
  'Explain in one or two plain-language sentences why this recommendation was made:\nTitle: {{title}}\nDescription: {{description}}\nContributing factors: {{factors}}';

const SUMMARIZE_TEMPLATE =
  "Summarize the following platform insights for a product owner in a short paragraph, highlighting anything at warning or critical severity:\n{{insights}}";

const ACTION_ITEMS_TEMPLATE =
  "Based on the following input, produce a short list of concrete action items, one per line, each starting with a dash:\n{{input}}";

function formatFactors(factors: RecommendationLike["factors"]): string {
  return factors.map((f) => `${f.label}: ${f.detail} (weight ${f.weight})`).join("; ") || "none recorded";
}

function formatInsights(insights: InsightLike[]): string {
  return insights.map((i) => `[${i.severity}] ${i.title} — ${i.description}`).join("\n");
}

/** Splits a generator's free-text response into discrete action items, tolerant of numbered lists, dashes, or plain lines. */
function splitActionItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s\-*•\d.)]+/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * Generic AI-assisted layer over recommendations and insights: explain a
 * recommendation, summarize a batch of insights, and turn either into
 * concrete action items. Backed entirely by the narrow `AITextGenerator`
 * interface, so it works with `TemplateAITextGenerator` (no AI) or any real
 * model bridged in via `fromAIProvider`.
 */
export class AIRecommendationAssistant {
  constructor(private readonly generator: AITextGenerator) {}

  async explainRecommendation(recommendation: RecommendationLike): Promise<string> {
    const prompt = interpolate(EXPLAIN_TEMPLATE, {
      title: recommendation.title,
      description: recommendation.description,
      factors: formatFactors(recommendation.factors),
    });
    return this.generator.generate(prompt);
  }

  async summarizeInsights(insights: InsightLike[]): Promise<string> {
    if (insights.length === 0) return "No insights to summarize.";
    const prompt = interpolate(SUMMARIZE_TEMPLATE, { insights: formatInsights(insights) });
    return this.generator.generate(prompt);
  }

  async generateActionItems(input: RecommendationLike[] | InsightLike[] | string): Promise<string[]> {
    const rendered =
      typeof input === "string"
        ? input
        : input
            .map((item) => ("title" in item ? `${item.title}: ${item.description}` : String(item)))
            .join("\n");
    const prompt = interpolate(ACTION_ITEMS_TEMPLATE, { input: rendered });
    const response = await this.generator.generate(prompt);
    return splitActionItems(response);
  }
}
