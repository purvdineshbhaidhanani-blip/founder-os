import { describe, expect, it } from "vitest";
import { checkConsistency } from "../../lib/services/consistency-engine.js";

describe("checkConsistency", () => {
  it("returns a perfect score with no drift for a compatible request", () => {
    const result = checkConsistency("A woman with blonde hair and blue eyes, athletic build", "standing in a heroic pose, smiling");
    expect(result.score).toBe(100);
    expect(result.driftWarnings).toHaveLength(0);
  });

  it("flags a hair-color contradiction", () => {
    const result = checkConsistency("A woman with blonde hair", "now with red hair, running");
    expect(result.driftWarnings.some((w) => w.includes("red hair"))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("flags multiple contradictions and lowers the score further", () => {
    const result = checkConsistency("blonde hair, blue eyes, athletic build", "brunette, green eyes, heavyset");
    expect(result.driftWarnings).toHaveLength(3);
    expect(result.score).toBe(25);
  });

  it("does not flag an attribute group the character has no locked value for", () => {
    const result = checkConsistency("a robot character", "with green eyes");
    expect(result.driftWarnings).toHaveLength(0);
  });

  it("never scores below 0", () => {
    const result = checkConsistency("blonde hair, blue eyes, athletic build, short hair, young adult", "brunette, green eyes, heavyset, long hair, elderly");
    expect(result.score).toBe(0);
  });
});
