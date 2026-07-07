import { describe, expect, it } from "vitest";
import { IntelligenceAPI } from "../../src/platform-intelligence/api/intelligence-api.js";
import { RuleBasedRecommendationSource } from "../../src/platform-intelligence/recommendation/rule-based.js";
import { RecommendationEngine } from "../../src/platform-intelligence/recommendation/engine.js";

describe("Intelligence API facade", () => {
  it("constructs with zero-config defaults for every module", async () => {
    const api = new IntelligenceAPI();
    expect(await api.getRecommendations({})).toEqual([]);
    expect(await api.getInsights()).toEqual([]);
    expect(api.registry.list().length).toBeGreaterThan(0);
  });

  it("wires an injected recommendation engine through the facade", async () => {
    const engine = new RecommendationEngine([
      new RuleBasedRecommendationSource("r", [
        { id: "always", when: () => true, recommend: () => ({ title: "T", description: "D", factors: [] }) },
      ]),
    ]);
    const api = new IntelligenceAPI({ recommendationEngine: engine });
    const recommendations = await api.getRecommendations({});
    expect(recommendations[0]!.title).toBe("T");
  });

  it("records feature usage and reports feature intelligence", () => {
    const api = new IntelligenceAPI();
    api.recordFeatureUsage("dark-mode", "user-1");
    api.recordFeatureUsage("dark-mode", "user-2");
    const result = api.getFeatureIntelligence("dark-mode", 10);
    expect(result.adoption.adoptedSubjects).toBe(2);
  });

  it("runs decisions and stores history through the facade", async () => {
    const api = new IntelligenceAPI();
    const record = await api.decide({}, [{ id: "a", label: "A", weight: 1, score: 0.9 }]);
    const history = await api.getDecisionHistory();
    expect(history.map((h) => h.id)).toContain(record.id);
  });

  it("generates AI-assisted explanations via the default template generator", async () => {
    const api = new IntelligenceAPI();
    const text = await api.explainRecommendation({ title: "T", description: "D", factors: [] });
    expect(typeof text).toBe("string");
    expect(text.length).toBeGreaterThan(0);
  });

  it("runs diagnostics and optimizations through the facade", async () => {
    const api = new IntelligenceAPI();
    const diagnostics = await api.runDiagnostics({});
    expect(diagnostics.issues).toEqual([]);
    const optimizations = await api.getOptimizations({});
    expect(optimizations).toEqual([]);
  });
});
