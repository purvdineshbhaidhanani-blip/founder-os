import { describe, expect, it } from "vitest";
import { ContextManager } from "../../src/runtime/context/index.js";

describe("ContextManager", () => {
  it("loads and trims slices by priority", () => {
    const ctx = new ContextManager();
    const slices = ctx.load([
      { source: "system", content: "system prompt", priority: 10, required: true },
      { source: "memory", content: "high-prio memory", priority: 5 },
      { source: "memory", content: "low-prio noise", priority: 1 },
    ]);
    const trimmed = ctx.trim(slices, 100);
    expect(trimmed.map((s) => s.source)).toContain("system");
  });

  it("compresses long content but keeps required slices", () => {
    const ctx = new ContextManager();
    const slices = ctx.load([
      {
        source: "system",
        content: "a".repeat(800),
        required: true,
        priority: 10,
      },
      { source: "memory", content: "b".repeat(800), priority: 1 },
    ]);
    const compressed = ctx.compress(slices, 50);
    const required = compressed.find((s) => s.required);
    expect(required?.content.length).toBeGreaterThan(0);
  });

  it("routes by audience", () => {
    const ctx = new ContextManager();
    const slices = ctx.load([
      { source: "memory", content: "for backend", audience: "backend" },
      { source: "memory", content: "for everyone" },
    ]);
    const routed = ctx.route(slices, "backend");
    expect(routed).toHaveLength(2);
    const routedFrontend = ctx.route(slices, "frontend");
    expect(routedFrontend).toHaveLength(1);
  });

  it("inherits shared + required slices into a child", () => {
    const ctx = new ContextManager();
    const parent = ctx.load([
      { source: "system", content: "rules", required: true },
      { source: "memory", content: "shared", tags: ["shared"] },
      { source: "memory", content: "private" },
    ]);
    const inherited = ctx.inherit(parent, "child");
    expect(inherited).toHaveLength(2);
  });
});
