import { describe, expect, it } from "vitest";
import { diffSnapshots } from "../../src/monitoring/diff.js";
import type { MonitorSnapshot, MonitorSnapshotItem } from "../../src/monitoring/types.js";

function makeItem(overrides: Partial<MonitorSnapshotItem> = {}): MonitorSnapshotItem {
  return {
    id: "item-1",
    title: "Widget Pro",
    url: "https://example.com/widget",
    fields: { price: "$49.00" },
    capturedAt: "2026-07-01T00:00:00.000Z",
    sourceId: "web-snapshot",
    ...overrides,
  };
}

function makeSnapshot(items: MonitorSnapshotItem[], capturedAt = "2026-07-01T00:00:00.000Z"): MonitorSnapshot {
  return { providerId: "web-snapshot", category: "pricing", query: "https://example.com/widget", capturedAt, items };
}

describe("diffSnapshots — pure diff engine", () => {
  it("returns an empty events array when nothing changed between two snapshots", () => {
    const previous = makeSnapshot([makeItem()]);
    const current = makeSnapshot([makeItem()], "2026-07-02T00:00:00.000Z");
    expect(diffSnapshots(previous, current)).toEqual([]);
  });

  it("emits an 'added' event for an item present in current but not previous", () => {
    const previous = makeSnapshot([]);
    const current = makeSnapshot([makeItem({ id: "new-item", title: "New Widget" })]);
    const events = diffSnapshots(previous, current);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "added", itemId: "new-item", title: "New Widget" });
  });

  it("emits a 'removed' event for an item present in previous but not current", () => {
    const previous = makeSnapshot([makeItem({ id: "gone-item", title: "Old Widget" })]);
    const current = makeSnapshot([]);
    const events = diffSnapshots(previous, current);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "removed", itemId: "gone-item", title: "Old Widget" });
  });

  it("emits a 'changed' event naming the field when a tracked field (e.g. price) differs", () => {
    const previous = makeSnapshot([makeItem({ fields: { price: "$49.00" } })]);
    const current = makeSnapshot([makeItem({ fields: { price: "$59.00" } })]);
    const events = diffSnapshots(previous, current);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "changed",
      itemId: "item-1",
      field: "price",
      previousValue: "$49.00",
      currentValue: "$59.00",
    });
  });

  it("emits one 'changed' event per differing field when multiple fields change", () => {
    const previous = makeSnapshot([makeItem({ fields: { price: "$49.00", stars: 10 } })]);
    const current = makeSnapshot([makeItem({ fields: { price: "$59.00", stars: 12 } })]);
    const events = diffSnapshots(previous, current);
    expect(events).toHaveLength(2);
    const fields = events.map((event) => event.field).sort();
    expect(fields).toEqual(["price", "stars"]);
  });

  it("returns [] on a true first run (previous snapshot is undefined) rather than reporting every current item as added", () => {
    const current = makeSnapshot([makeItem(), makeItem({ id: "item-2" })]);
    expect(diffSnapshots(undefined, current)).toEqual([]);
  });

  it("treats an explicit empty previous snapshot (a real prior check that found zero items) as a real baseline, so current items ARE reported as added", () => {
    const previous = makeSnapshot([]);
    const current = makeSnapshot([makeItem()]);
    const events = diffSnapshots(previous, current);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("added");
  });

  it("returns [] when both previous and current snapshots are empty", () => {
    const previous = makeSnapshot([]);
    const current = makeSnapshot([]);
    expect(diffSnapshots(previous, current)).toEqual([]);
  });

  it("is deterministic: running the same diff twice on identical inputs yields identical output", () => {
    const previous = makeSnapshot([makeItem({ fields: { price: "$49.00" } })]);
    const current = makeSnapshot([makeItem({ fields: { price: "$59.00" } }), makeItem({ id: "item-2" })]);
    const first = diffSnapshots(previous, current);
    const second = diffSnapshots(previous, current);
    expect(second).toEqual(first);
  });

  it("degrades to no-op instead of throwing when a persisted previous snapshot is malformed (missing/non-array items)", () => {
    const malformedPrevious = { ...makeSnapshot([]), items: undefined as unknown as MonitorSnapshotItem[] };
    const current = makeSnapshot([makeItem()]);
    expect(() => diffSnapshots(malformedPrevious, current)).not.toThrow();
    const events = diffSnapshots(malformedPrevious, current);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("added");
  });

  it("degrades to no-op (treats items as empty) instead of throwing when the current snapshot is malformed (missing/non-array items)", () => {
    const previous = makeSnapshot([makeItem()]);
    const malformedCurrent = { ...makeSnapshot([]), items: null as unknown as MonitorSnapshotItem[] };
    expect(() => diffSnapshots(previous, malformedCurrent)).not.toThrow();
    // Malformed current degrades to an empty item list, so the previous item
    // is correctly reported as "removed" — same as a real empty current snapshot.
    const events = diffSnapshots(previous, malformedCurrent);
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("removed");
  });
});
