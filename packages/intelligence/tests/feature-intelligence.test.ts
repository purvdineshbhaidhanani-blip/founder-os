import { describe, expect, it } from "vitest";
import { FeatureIntelligenceTracker } from "../src/feature-intelligence/tracker.js";

describe("Feature Intelligence", () => {
  it("tracks usage and computes adoption", () => {
    const tracker = new FeatureIntelligenceTracker();
    tracker.recordUsage("dark-mode", "user-1");
    tracker.recordUsage("dark-mode", "user-2");
    tracker.recordUsage("dark-mode", "user-1");

    const summary = tracker.usageSummary("dark-mode");
    expect(summary.totalEvents).toBe(3);
    expect(summary.uniqueSubjects).toBe(2);

    const adoption = tracker.adoption("dark-mode", 10);
    expect(adoption.adoptedSubjects).toBe(2);
    expect(adoption.adoptionRate).toBeCloseTo(0.2);
  });

  it("computes a success score against target adoption and retention", () => {
    const tracker = new FeatureIntelligenceTracker();
    for (let i = 0; i < 6; i++) tracker.recordUsage("exports", `user-${i}`);

    const result = tracker.successScore("exports", 10, { targetAdoptionRate: 0.5, targetRetentionRate: 0.8 }, 0.9);
    expect(result.meetsCriteria).toBe(true);
    expect(result.score).toBeGreaterThan(0.5);
  });

  it("flags a declining, low-adoption feature as a retirement candidate", () => {
    const tracker = new FeatureIntelligenceTracker();
    tracker.recordUsage("legacy-export", "user-1", "2026-01-01T00:00:00.000Z");
    for (let i = 0; i < 20; i++) tracker.recordUsage("legacy-export", `heavy-user-${i}`, "2026-01-02T00:00:00.000Z");
    tracker.recordUsage("legacy-export", "user-2", "2026-01-03T00:00:00.000Z");

    const candidates = tracker.retirementCandidates({ "legacy-export": 1000 });
    expect(candidates).toContain("legacy-export");
  });

  it("classifies lifecycle stage based on adoption and trend", () => {
    const tracker = new FeatureIntelligenceTracker();
    // Very low adoption relative to total subjects => emerging.
    tracker.recordUsage("beta-feature", "user-1");
    expect(tracker.lifecycleStage("beta-feature", 1000)).toBe("emerging");
  });
});
