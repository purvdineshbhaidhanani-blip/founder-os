import { describe, expect, it } from "vitest";
import { engineeringTemplate } from "../../src/templates/engineering.js";
import { documentationTemplate } from "../../src/templates/documentation.js";
import { AgentRuntime } from "../../src/runtime/agents/index.js";

function blueprint(name: string, template = engineeringTemplate) {
  return template.build({ name, displayName: name, owner: "platform-team" });
}

describe("AgentRuntime", () => {
  it("registers and looks up agents by capability", () => {
    const runtime = new AgentRuntime();
    runtime.register(blueprint("eng-1"));
    runtime.register(blueprint("doc-1", documentationTemplate));
    const matches = runtime.findByCapability("Implement");
    expect(matches.map((descriptor) => descriptor.name)).toContain("eng-1");
  });

  it("transitions lifecycle states", () => {
    const runtime = new AgentRuntime();
    runtime.register(blueprint("eng-1"));
    runtime.activate("eng-1");
    expect(runtime.get("eng-1")?.status).toBe("active");
    runtime.deactivate("eng-1");
    expect(runtime.get("eng-1")?.status).toBe("inactive");
  });

  it("exposes execution contracts derived from blueprint", () => {
    const runtime = new AgentRuntime();
    runtime.register(blueprint("eng-1"));
    const contract = runtime.contract("eng-1");
    expect(contract.allowedTools).toContain("Read");
    expect(contract.permissions.filesystem).toBe("read-write");
  });

  it("tracks health via heartbeats", () => {
    const runtime = new AgentRuntime();
    runtime.register(blueprint("eng-1"));
    runtime.activate("eng-1");
    runtime.heartbeat("eng-1", { ok: false, message: "stuck" });
    expect(runtime.get("eng-1")?.status).toBe("unhealthy");
    runtime.heartbeat("eng-1", { ok: true });
    expect(runtime.get("eng-1")?.status).toBe("active");
  });
});
