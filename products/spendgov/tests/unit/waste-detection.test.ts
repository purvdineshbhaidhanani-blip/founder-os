import { describe, expect, it } from "vitest";
import { detectWaste } from "../../lib/services/waste-detection.js";

describe("detectWaste", () => {
  it("flags a subscription with under-5% seat utilization as unused", () => {
    const findings = detectWaste([
      { id: "1", monthlyCostCents: 1000_00, seatsPurchased: 100, seatsActive: 2, lastUsedAt: null, status: "active" },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe("unused");
    expect(findings[0]!.estimatedSavingsCents).toBe(1000_00);
  });

  it("flags 5-50% utilization as underutilized with proportional savings", () => {
    const findings = detectWaste([
      { id: "1", monthlyCostCents: 1000_00, seatsPurchased: 100, seatsActive: 20, lastUsedAt: null, status: "active" },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe("underutilized");
    expect(findings[0]!.estimatedSavingsCents).toBe(800_00);
  });

  it("flags high utilization with a large absolute seat gap as overprovisioned", () => {
    const findings = detectWaste([
      { id: "1", monthlyCostCents: 10_000_00, seatsPurchased: 1000, seatsActive: 700, lastUsedAt: null, status: "active" },
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe("overprovisioned");
  });

  it("does not flag a well-utilized subscription with a small seat gap", () => {
    const findings = detectWaste([
      { id: "1", monthlyCostCents: 100_00, seatsPurchased: 10, seatsActive: 9, lastUsedAt: null, status: "active" },
    ]);
    expect(findings).toHaveLength(0);
  });

  it("falls back to lastUsedAt recency when seat counts aren't tracked", () => {
    const now = new Date("2026-07-10T00:00:00Z");
    const findings = detectWaste(
      [{ id: "1", monthlyCostCents: 50_00, seatsPurchased: null, seatsActive: null, lastUsedAt: new Date("2026-01-01T00:00:00Z"), status: "active" }],
      now,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.type).toBe("unused");
  });

  it("flags a subscription that has never been used", () => {
    const findings = detectWaste([
      { id: "1", monthlyCostCents: 50_00, seatsPurchased: null, seatsActive: null, lastUsedAt: null, status: "active" },
    ]);
    expect(findings).toHaveLength(1);
  });

  it("ignores canceled subscriptions", () => {
    const findings = detectWaste([
      { id: "1", monthlyCostCents: 50_00, seatsPurchased: null, seatsActive: null, lastUsedAt: null, status: "canceled" },
    ]);
    expect(findings).toHaveLength(0);
  });
});
