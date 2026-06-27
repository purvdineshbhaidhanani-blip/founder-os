import { describe, expect, it } from "vitest";
import { emptyRegistry } from "../src/types/registry.js";
import {
  findByName,
  listAgents,
  setAgentStatus,
  upsertRegistryEntry,
} from "../src/registry/registryManager.js";
import { engineeringTemplate } from "../src/templates/engineering.js";

function makeBlueprint(name: string) {
  return engineeringTemplate.build({
    name,
    displayName: `Test ${name}`,
    owner: "platform-team",
  });
}

describe("registry", () => {
  it("creates an entry on first upsert", () => {
    const blueprint = makeBlueprint("first-agent");
    const result = upsertRegistryEntry(emptyRegistry("1.0.0"), {
      blueprint,
      filePath: ".claude/agents/first-agent.md",
    });
    expect(result.changed).toBe(true);
    expect(result.entry.name).toBe("first-agent");
    expect(result.entry.updateHistory[0]?.action).toBe("created");
  });

  it("is idempotent on identical re-registration", () => {
    const blueprint = makeBlueprint("idem-agent");
    const first = upsertRegistryEntry(emptyRegistry("1.0.0"), {
      blueprint,
      filePath: ".claude/agents/idem-agent.md",
    });
    const second = upsertRegistryEntry(first.registry, {
      blueprint,
      filePath: ".claude/agents/idem-agent.md",
    });
    expect(second.changed).toBe(false);
    expect(second.entry.updateHistory).toHaveLength(1);
  });

  it("appends a regenerated history entry when content changes", () => {
    const blueprint = makeBlueprint("regen-agent");
    const first = upsertRegistryEntry(emptyRegistry("1.0.0"), {
      blueprint,
      filePath: ".claude/agents/regen-agent.md",
    });
    const modified = { ...blueprint, version: "1.1.0" };
    const second = upsertRegistryEntry(first.registry, {
      blueprint: modified,
      filePath: ".claude/agents/regen-agent.md",
    });
    expect(second.changed).toBe(true);
    expect(second.entry.updateHistory).toHaveLength(2);
    expect(second.entry.updateHistory.at(-1)?.action).toBe("regenerated");
  });

  it("filters by category and status", () => {
    const a = upsertRegistryEntry(emptyRegistry("1.0.0"), {
      blueprint: makeBlueprint("agent-a"),
      filePath: ".claude/agents/agent-a.md",
    });
    const b = upsertRegistryEntry(a.registry, {
      blueprint: makeBlueprint("agent-b"),
      filePath: ".claude/agents/agent-b.md",
    });
    expect(listAgents(b.registry, { category: "engineering" })).toHaveLength(2);
    expect(listAgents(b.registry, { category: "documentation" })).toHaveLength(0);
    expect(findByName(b.registry, "agent-a")?.name).toBe("agent-a");
  });

  it("transitions status with a history entry", () => {
    const start = upsertRegistryEntry(emptyRegistry("1.0.0"), {
      blueprint: makeBlueprint("status-agent"),
      filePath: ".claude/agents/status-agent.md",
    });
    const result = setAgentStatus(start.registry, "status-agent", "deprecated", "superseded");
    expect(result.ok).toBe(true);
    if (result.ok) {
      const entry = findByName(result.value, "status-agent");
      expect(entry?.status).toBe("deprecated");
      expect(entry?.updateHistory.at(-1)?.action).toBe("deprecated");
    }
  });
});
