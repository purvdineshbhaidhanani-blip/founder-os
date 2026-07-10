import { describe, expect, it } from "vitest";
import { computeServiceHealth } from "../../lib/services/service-health.js";

describe("computeServiceHealth", () => {
  it("returns healthy for no alerts", () => {
    expect(computeServiceHealth([])).toBe("healthy");
  });

  it("returns healthy for a single warning", () => {
    expect(computeServiceHealth([{ severity: "warning" }])).toBe("healthy");
  });

  it("returns degraded for two or more warnings without a critical", () => {
    expect(computeServiceHealth([{ severity: "warning" }, { severity: "warning" }])).toBe("degraded");
  });

  it("returns down for any critical alert, regardless of other alerts", () => {
    expect(computeServiceHealth([{ severity: "info" }, { severity: "critical" }])).toBe("down");
  });

  it("prioritizes down over degraded", () => {
    expect(computeServiceHealth([{ severity: "warning" }, { severity: "warning" }, { severity: "critical" }])).toBe("down");
  });
});
