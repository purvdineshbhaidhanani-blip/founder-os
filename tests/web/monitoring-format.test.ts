import { describe, expect, it } from "vitest";
import {
  failureReasonLabel,
  formatChange,
  newlyDetected,
  providerStatus,
  summarizeRun,
} from "../../web/src/lib/monitoring-format";
import type { MonitorProviderRunResult, MonitorRunResult } from "../../web/src/api/types";

function providerResult(overrides: Partial<MonitorProviderRunResult> = {}): MonitorProviderRunResult {
  return {
    providerId: "github-trending",
    category: "trending-github",
    ok: true,
    firstRun: false,
    itemCount: 2,
    changes: [],
    ...overrides,
  };
}

function run(results: MonitorProviderRunResult[]): MonitorRunResult {
  const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);
  return {
    runId: "monrun_1",
    query: "acme",
    windowDays: 30,
    startedAt: "2026-07-01T00:00:00.000Z",
    completedAt: "2026-07-01T00:00:01.000Z",
    durationMs: 1000,
    providersRun: results.filter((r) => r.ok).map((r) => r.providerId),
    providersFailed: results.filter((r) => !r.ok).map((r) => r.providerId),
    totalChanges,
    results,
  };
}

describe("monitoring-format", () => {
  it("summarizes change types and provider outcomes across a run", () => {
    const r = run([
      providerResult({
        changes: [
          { type: "added", itemId: "a", title: "A", url: "u", sourceId: "github-trending" },
          { type: "changed", itemId: "b", title: "B", url: "u", sourceId: "github-trending", field: "stars", previousValue: 1, currentValue: 2 },
        ],
      }),
      providerResult({ providerId: "rss-market", category: "market", ok: false, reason: "network-failure", error: "down", changes: [] }),
      providerResult({ providerId: "hn", category: "product-hunt", firstRun: true, changes: [] }),
    ]);
    const summary = summarizeRun(r);
    expect(summary).toMatchObject({ added: 1, changed: 1, removed: 0, providersOk: 2, providersFailed: 1, firstRunProviders: 1 });
  });

  it("formats each change type as a readable line", () => {
    expect(formatChange({ type: "added", itemId: "1", title: "New Repo", url: "u", sourceId: "s" })).toBe("New: New Repo");
    expect(formatChange({ type: "removed", itemId: "1", title: "Gone", url: "u", sourceId: "s" })).toBe("Removed: Gone");
    expect(
      formatChange({ type: "changed", itemId: "1", title: "Widget", url: "u", sourceId: "s", field: "price", previousValue: "$9", currentValue: "$12" }),
    ).toBe("Widget: price $9 → $12");
  });

  it("collects only 'added' changes as newly detected", () => {
    const r = run([
      providerResult({
        changes: [
          { type: "added", itemId: "a", title: "A", url: "u", sourceId: "s" },
          { type: "removed", itemId: "b", title: "B", url: "u", sourceId: "s" },
        ],
      }),
    ]);
    expect(newlyDetected(r).map((c) => c.title)).toEqual(["A"]);
  });

  it("maps failure reasons to human labels and defaults safely", () => {
    expect(failureReasonLabel("api-limit")).toContain("rate limit");
    expect(failureReasonLabel(undefined)).toBe("Unknown error");
  });

  it("derives provider status for badges", () => {
    expect(providerStatus(providerResult())).toBe("ok");
    expect(providerStatus(providerResult({ firstRun: true }))).toBe("first-run");
    expect(providerStatus(providerResult({ ok: false, reason: "network-failure" }))).toBe("failed");
  });
});
