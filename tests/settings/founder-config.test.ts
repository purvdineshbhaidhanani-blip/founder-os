import { describe, expect, it } from "vitest";
import { loadFounderConfig, resolveAliasedModel } from "../../src/settings/founder-config.js";

describe("loadFounderConfig", () => {
  it("applies safe defaults when no env vars are set", () => {
    const { config, ok, issues } = loadFounderConfig({});
    expect(ok).toBe(true);
    expect(issues).toEqual([]);
    expect(config.ollamaHost).toBe("http://127.0.0.1:11434");
    expect(config.defaultModel).toBe("llama3.1");
    expect(config.logLevel).toBe("info");
    expect(config.maxToolTurns).toBe(5);
    expect(config.modelAliases).toEqual({});
  });

  it("reads every supported env var", () => {
    const { config } = loadFounderConfig({
      FOUNDER_WORKSPACE: "/tmp/some-workspace",
      OLLAMA_HOST: "http://localhost:9999",
      FOUNDER_DEFAULT_MODEL: "llama3.2",
      AGENT_FACTORY_LOG_LEVEL: "debug",
      AGENT_FACTORY_LOG_FORMAT: "json",
      FOUNDER_MAX_TOOL_TURNS: "10",
      FOUNDER_APPROVAL_TIMEOUT_SECONDS: "60",
    });
    expect(config.workspaceRoot).toBe("/tmp/some-workspace");
    expect(config.ollamaHost).toBe("http://localhost:9999");
    expect(config.defaultModel).toBe("llama3.2");
    expect(config.logLevel).toBe("debug");
    expect(config.logFormat).toBe("json");
    expect(config.maxToolTurns).toBe(10);
    expect(config.approvalTimeoutSeconds).toBe(60);
  });

  it("parses FOUNDER_MODEL_ALIASES as a JSON string->string map", () => {
    const { config, issues } = loadFounderConfig({
      FOUNDER_MODEL_ALIASES: JSON.stringify({ opus: "llama3.1:70b", sonnet: "llama3.1", haiku: "llama3.2" }),
    });
    expect(issues).toEqual([]);
    expect(config.modelAliases).toEqual({ opus: "llama3.1:70b", sonnet: "llama3.1", haiku: "llama3.2" });
  });

  it("never throws on malformed FOUNDER_MODEL_ALIASES — reports an issue and falls back to no aliases", () => {
    const { config, ok, issues } = loadFounderConfig({ FOUNDER_MODEL_ALIASES: "{not valid json" });
    expect(ok).toBe(false);
    expect(issues[0]?.path).toBe("FOUNDER_MODEL_ALIASES");
    expect(config.modelAliases).toEqual({});
  });

  it("never throws on a malformed numeric env var — reports an issue and salvages the other fields", () => {
    const { config, ok, issues } = loadFounderConfig({
      FOUNDER_MAX_TOOL_TURNS: "not-a-number",
      FOUNDER_DEFAULT_MODEL: "llama3.2",
    });
    expect(ok).toBe(false);
    expect(issues.some((i) => i.path === "maxToolTurns")).toBe(true);
    expect(config.maxToolTurns).toBe(5); // fell back to default
    expect(config.defaultModel).toBe("llama3.2"); // the OTHER valid field was not discarded
  });

  it("rejects an invalid ollamaHost URL and falls back to the default", () => {
    const { config, ok } = loadFounderConfig({ OLLAMA_HOST: "not-a-url" });
    expect(ok).toBe(false);
    expect(config.ollamaHost).toBe("http://127.0.0.1:11434");
  });
});

describe("resolveAliasedModel", () => {
  it("uses the configured alias when the frontmatter hint matches", () => {
    const { config } = loadFounderConfig({ FOUNDER_MODEL_ALIASES: JSON.stringify({ opus: "llama3.1:70b" }) });
    expect(resolveAliasedModel(config, "opus")).toBe("llama3.1:70b");
  });

  it("falls back to defaultModel when there is no alias for the hint", () => {
    const { config } = loadFounderConfig({});
    expect(resolveAliasedModel(config, "opus")).toBe(config.defaultModel);
  });

  it("falls back to defaultModel when there is no frontmatter hint at all", () => {
    const { config } = loadFounderConfig({});
    expect(resolveAliasedModel(config, undefined)).toBe(config.defaultModel);
  });
});
