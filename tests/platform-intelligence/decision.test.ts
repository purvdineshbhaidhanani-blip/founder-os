import { describe, expect, it } from "vitest";
import { DecisionEngine } from "../../src/platform-intelligence/decision/engine.js";
import { weightedScore } from "../../src/platform-intelligence/decision/scoring.js";
import { classifyByThreshold } from "../../src/platform-intelligence/decision/thresholds.js";

describe("Decision Engine", () => {
  it("weightedScore computes a normalized weighted average", () => {
    const score = weightedScore([
      { id: "a", label: "A", weight: 1, score: 1 },
      { id: "b", label: "B", weight: 1, score: 0 },
    ]);
    expect(score).toBeCloseTo(0.5);
  });

  it("classifyByThreshold picks the highest band the score clears", () => {
    expect(classifyByThreshold(0.8)).toBe("go");
    expect(classifyByThreshold(0.5)).toBe("watch");
    expect(classifyByThreshold(0.1)).toBe("no-go");
  });

  it("decide() combines scoring, rules, thresholds, and confidence, and records history", async () => {
    const engine = new DecisionEngine();
    const record = await engine.decide(
      { productId: "p1" },
      [
        { id: "market", label: "Market size", weight: 2, score: 0.9 },
        { id: "risk", label: "Risk", weight: 1, score: 0.4 },
      ],
      [{ id: "has-budget", description: "Has budget allocated", evaluate: (ctx) => Boolean(ctx.hasBudget) }],
    );

    expect(record.score).toBeCloseTo((2 * 0.9 + 1 * 0.4) / 3);
    expect(record.label).toBe("go");
    expect(record.confidenceLevel).toBe("medium");
    expect(record.ruleResults).toEqual([{ ruleId: "has-budget", description: "Has budget allocated", passed: false }]);

    const history = await engine.history();
    expect(history).toHaveLength(1);
    expect(history[0]!.id).toBe(record.id);
  });

  it("a throwing rule is treated as failed, not a crash", async () => {
    const engine = new DecisionEngine();
    const record = await engine.decide({}, [{ id: "a", label: "A", weight: 1, score: 1 }], [
      {
        id: "broken",
        description: "broken rule",
        evaluate: () => {
          throw new Error("boom");
        },
      },
    ]);
    expect(record.ruleResults[0]!.passed).toBe(false);
  });
});
