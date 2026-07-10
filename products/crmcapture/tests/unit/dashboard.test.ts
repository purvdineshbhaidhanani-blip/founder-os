import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("buckets leads by status", () => {
    const summary = summarizeDashboard([
      { status: "new", score: 50 },
      { status: "new", score: 30 },
      { status: "qualified", score: 80 },
      { status: "converted", score: 90 },
    ]);
    expect(summary.newLeadCount).toBe(2);
    expect(summary.qualifiedLeadCount).toBe(1);
    expect(summary.convertedLeadCount).toBe(1);
    expect(summary.leadsByStatus).toEqual({ new: 2, qualified: 1, converted: 1 });
  });

  it("computes the average score", () => {
    const summary = summarizeDashboard([
      { status: "new", score: 40 },
      { status: "new", score: 60 },
    ]);
    expect(summary.averageScore).toBe(50);
  });

  it("returns zeroed summary for no leads", () => {
    const summary = summarizeDashboard([]);
    expect(summary.newLeadCount).toBe(0);
    expect(summary.averageScore).toBe(0);
    expect(summary.leadsByStatus).toEqual({});
  });
});
