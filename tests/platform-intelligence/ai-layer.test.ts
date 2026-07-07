import { describe, expect, it } from "vitest";
import { AIRecommendationAssistant } from "../../src/platform-intelligence/ai-layer/assistant.js";
import { TemplateAITextGenerator } from "../../src/platform-intelligence/ai-layer/template-generator.js";
import { fromAIProvider } from "../../src/platform-intelligence/ai-layer/adapter.js";
import { MockProvider } from "../../src/engines/ai/providers/mock-provider.js";

describe("AI Recommendation Layer", () => {
  it("TemplateAITextGenerator works with zero AI provider configured", async () => {
    const generator = new TemplateAITextGenerator();
    const result = await generator.generate("hello world");
    expect(result).toContain("hello world");
  });

  it("explainRecommendation builds a prompt from factors and returns generated text", async () => {
    const captured: string[] = [];
    const generator = new TemplateAITextGenerator({
      respond: (prompt) => {
        captured.push(prompt);
        return "Because adoption is low.";
      },
    });
    const assistant = new AIRecommendationAssistant(generator);
    const result = await assistant.explainRecommendation({
      title: "Improve onboarding",
      description: "Adoption is low",
      factors: [{ label: "adoption", detail: "Adoption rate is 5%", weight: 0.9 }],
    });
    expect(result).toBe("Because adoption is low.");
    expect(captured[0]).toContain("Adoption rate is 5%");
  });

  it("summarizeInsights returns a placeholder message with no insights", async () => {
    const assistant = new AIRecommendationAssistant(new TemplateAITextGenerator());
    expect(await assistant.summarizeInsights([])).toBe("No insights to summarize.");
  });

  it("generateActionItems splits a dashed list response into discrete items", async () => {
    const generator = new TemplateAITextGenerator({
      respond: () => "- Do the first thing\n- Do the second thing\n",
    });
    const assistant = new AIRecommendationAssistant(generator);
    const items = await assistant.generateActionItems("some insights");
    expect(items).toEqual(["Do the first thing", "Do the second thing"]);
  });

  it("fromAIProvider bridges a Loop 2 AIProvider into an AITextGenerator", async () => {
    const provider = new MockProvider({ respond: () => "bridged response" });
    const generator = fromAIProvider(provider, { model: "mock-1" });
    const result = await generator.generate("prompt text");
    expect(result).toBe("bridged response");
  });
});
