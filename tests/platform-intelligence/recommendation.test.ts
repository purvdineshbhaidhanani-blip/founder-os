import { describe, expect, it } from "vitest";
import { RecommendationEngine } from "../../src/platform-intelligence/recommendation/engine.js";
import { RuleBasedRecommendationSource } from "../../src/platform-intelligence/recommendation/rule-based.js";
import { AIRecommendationSource } from "../../src/platform-intelligence/recommendation/ai-powered.js";
import type { AITextGenerator } from "../../src/platform-intelligence/shared/ai-text-generator.js";

describe("Recommendation Engine", () => {
  it("generates rule-based recommendations with confidence and explanations", async () => {
    const source = new RuleBasedRecommendationSource("rules", [
      {
        id: "low-adoption",
        when: (ctx) => (ctx.adoptionRate as number) < 0.2,
        recommend: () => ({
          title: "Improve onboarding",
          description: "Adoption is low.",
          factors: [{ label: "adoption", detail: "Adoption rate is below 20%", weight: 0.9 }],
        }),
      },
      {
        id: "high-adoption",
        when: (ctx) => (ctx.adoptionRate as number) >= 0.2,
        recommend: () => ({ title: "Not triggered", description: "", factors: [] }),
      },
    ]);

    const engine = new RecommendationEngine([source]);
    const recommendations = await engine.generate({ adoptionRate: 0.1 });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]!.title).toBe("Improve onboarding");
    expect(recommendations[0]!.confidence).toBeCloseTo(0.9);
    expect(recommendations[0]!.confidenceLevel).toBe("high");
    expect(recommendations[0]!.explanation).toContain("Adoption rate is below 20%");
  });

  it("ranks recommendations by priority (confidence) descending", async () => {
    const source = new RuleBasedRecommendationSource("rules", [
      { id: "a", when: () => true, recommend: () => ({ title: "Low", description: "", factors: [{ label: "x", detail: "d", weight: 0.2 }] }) },
      { id: "b", when: () => true, recommend: () => ({ title: "High", description: "", factors: [{ label: "x", detail: "d", weight: 0.9 }] }) },
    ]);
    const engine = new RecommendationEngine([source]);
    const recommendations = await engine.generate({});
    expect(recommendations.map((r) => r.title)).toEqual(["High", "Low"]);
  });

  it("AIRecommendationSource parses a JSON array response into drafts", async () => {
    const generator: AITextGenerator = {
      generate: async () =>
        JSON.stringify([
          { title: "Enable caching", description: "Reduce latency", factors: [{ label: "latency", detail: "p95 is high", weight: 0.8 }] },
        ]),
    };
    const source = new AIRecommendationSource({ generator });
    const engine = new RecommendationEngine([source]);
    const recommendations = await engine.generate({});
    expect(recommendations[0]!.title).toBe("Enable caching");
    expect(recommendations[0]!.sourceType).toBe("ai");
  });

  it("AIRecommendationSource falls back to a single draft when the response isn't valid JSON", async () => {
    const generator: AITextGenerator = { generate: async () => "Just do the thing." };
    const source = new AIRecommendationSource({ generator });
    const engine = new RecommendationEngine([source]);
    const recommendations = await engine.generate({});
    expect(recommendations).toHaveLength(1);
    expect(recommendations[0]!.description).toBe("Just do the thing.");
  });
});
