import { describe, expect, it } from "vitest";
import { ExtensionRegistry } from "../../src/factory/extensions/registry.js";
import { ModuleRegistry } from "../../src/factory/modules/registry.js";

describe("Extension System", () => {
  it("installs, enables, disables, and uninstalls an extension through its lifecycle hooks", async () => {
    const events: string[] = [];
    const moduleRegistry = new ModuleRegistry();
    const registry = new ExtensionRegistry({ moduleRegistry });

    registry.register({
      id: "slack-connector",
      name: "Slack Connector",
      version: "1.0.0",
      modules: [{ id: "slack", name: "Slack", description: "Slack integration", category: "integration" }],
      onInstall: () => { events.push("install"); },
      onEnable: () => { events.push("enable"); },
      onDisable: () => { events.push("disable"); },
      onUninstall: () => { events.push("uninstall"); },
    });

    expect(registry.isInstalled("slack-connector")).toBe(false);

    await registry.install("slack-connector");
    expect(registry.isInstalled("slack-connector")).toBe(true);
    expect(moduleRegistry.has("slack")).toBe(true);

    await registry.enable("slack-connector");
    expect(registry.isEnabled("slack-connector")).toBe(true);
    expect(moduleRegistry.isEnabled("slack")).toBe(true);

    await registry.disable("slack-connector");
    expect(registry.isEnabled("slack-connector")).toBe(false);

    await registry.uninstall("slack-connector");
    expect(registry.isInstalled("slack-connector")).toBe(false);
    expect(moduleRegistry.has("slack")).toBe(false);

    expect(events).toEqual(["install", "enable", "disable", "uninstall"]);
  });

  it("refuses to enable an extension that was never installed", async () => {
    const registry = new ExtensionRegistry();
    registry.register({ id: "x", name: "X", version: "1.0.0" });
    await expect(registry.enable("x")).rejects.toThrow();
  });

  it("refuses to install an extension that depends on an unknown module", async () => {
    const registry = new ExtensionRegistry();
    registry.register({ id: "x", name: "X", version: "1.0.0", dependsOn: ["nonexistent"] });
    await expect(registry.install("x")).rejects.toThrow();
  });
});
