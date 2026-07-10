import { describe, expect, it } from "vitest";
import { correlateAlertsIntoIncidents } from "../../lib/services/correlation-engine.js";

const minutes = (n: number, base = new Date("2026-01-01T00:00:00Z")) => new Date(base.getTime() + n * 60_000);

describe("correlateAlertsIntoIncidents", () => {
  it("groups alerts for the same service within the window into one incident", () => {
    const groups = correlateAlertsIntoIncidents(
      [
        { id: "a1", serviceId: "svc-1", occurredAt: minutes(0) },
        { id: "a2", serviceId: "svc-1", occurredAt: minutes(3) },
      ],
      5,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.alertIds.sort()).toEqual(["a1", "a2"]);
  });

  it("splits alerts into separate incidents when the gap exceeds the window", () => {
    const groups = correlateAlertsIntoIncidents(
      [
        { id: "a1", serviceId: "svc-1", occurredAt: minutes(0) },
        { id: "a2", serviceId: "svc-1", occurredAt: minutes(30) },
      ],
      5,
    );
    expect(groups).toHaveLength(2);
  });

  it("chains alerts spaced closer than the window even if total span exceeds it", () => {
    const groups = correlateAlertsIntoIncidents(
      [
        { id: "a1", serviceId: "svc-1", occurredAt: minutes(0) },
        { id: "a2", serviceId: "svc-1", occurredAt: minutes(4) },
        { id: "a3", serviceId: "svc-1", occurredAt: minutes(8) },
      ],
      5,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.alertIds).toHaveLength(3);
  });

  it("never groups alerts from different services together", () => {
    const groups = correlateAlertsIntoIncidents(
      [
        { id: "a1", serviceId: "svc-1", occurredAt: minutes(0) },
        { id: "a2", serviceId: "svc-2", occurredAt: minutes(1) },
      ],
      5,
    );
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.serviceId).sort()).toEqual(["svc-1", "svc-2"]);
  });

  it("returns no groups for no alerts", () => {
    expect(correlateAlertsIntoIncidents([], 5)).toHaveLength(0);
  });
});
