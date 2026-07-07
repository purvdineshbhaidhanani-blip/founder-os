import { describe, expect, it } from "vitest";
import { ConfigurationEngine } from "../../src/factory/config/engine.js";
import { EnvironmentConfig } from "../../src/factory/config/env.js";
import { FeatureFlagStore } from "../../src/factory/config/features.js";
import { ProviderConfigRegistry } from "../../src/factory/config/providers.js";
import { validateDeploymentConfig } from "../../src/factory/config/deployment.js";

describe("Configuration Engine — environment", () => {
  it("validates required vars and applies defaults", () => {
    const env = new EnvironmentConfig({
      vars: [
        { key: "PORT", default: "3000" },
        { key: "API_KEY", required: true },
      ],
      source: { API_KEY: "secret" },
    });
    const result = env.validate();
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.PORT).toBe("3000");
      expect(result.value.API_KEY).toBe("secret");
    }
  });

  it("fails validation when a required var is missing", () => {
    const env = new EnvironmentConfig({ vars: [{ key: "API_KEY", required: true }], source: {} });
    expect(env.validate().valid).toBe(false);
  });

  it("renders a .env.example listing every declared var", () => {
    const env = new EnvironmentConfig({ vars: [{ key: "PORT", default: "3000", description: "HTTP port" }] });
    expect(env.toEnvExample()).toContain("PORT=3000");
  });
});

describe("Configuration Engine — feature flags", () => {
  it("returns the default when no override or rollout applies", () => {
    const flags = new FeatureFlagStore([{ key: "new-dashboard", default: true }]);
    expect(flags.isEnabled("new-dashboard")).toBe(true);
  });

  it("respects an explicit override over the computed value", () => {
    const flags = new FeatureFlagStore([{ key: "new-dashboard", default: true }]);
    flags.override("new-dashboard", false);
    expect(flags.isEnabled("new-dashboard")).toBe(false);
  });

  it("scopes a flag to specific environments", () => {
    const flags = new FeatureFlagStore([{ key: "beta", default: true, environments: ["staging"] }]);
    expect(flags.isEnabled("beta", { environment: "production" })).toBe(false);
    expect(flags.isEnabled("beta", { environment: "staging" })).toBe(true);
  });

  it("rollout percentage is deterministic per subject", () => {
    const flags = new FeatureFlagStore([{ key: "gradual", default: false, rolloutPercentage: 50 }]);
    const first = flags.isEnabled("gradual", { subjectId: "user-1" });
    const second = flags.isEnabled("gradual", { subjectId: "user-1" });
    expect(first).toBe(second);
  });
});

describe("Configuration Engine — providers", () => {
  it("registers, activates, and retrieves the active provider per category", () => {
    const providers = new ProviderConfigRegistry();
    providers.register({ category: "ai", id: "anthropic", config: { apiKey: "x" } });
    providers.register({ category: "ai", id: "openai", config: { apiKey: "y" } });
    providers.setActive("ai", "openai");
    expect(providers.getActive("ai")?.id).toBe("openai");
    expect(providers.listByCategory("ai")).toHaveLength(2);
  });

  it("throws when activating an unregistered provider", () => {
    const providers = new ProviderConfigRegistry();
    expect(() => providers.setActive("ai", "unknown")).toThrow();
  });
});

describe("Configuration Engine — deployment", () => {
  it("rejects replicas < 1", () => {
    expect(validateDeploymentConfig({ target: "container", replicas: 0, healthCheckPath: "/health" }).valid).toBe(
      false,
    );
  });

  it("accepts a well-formed container deployment", () => {
    expect(validateDeploymentConfig({ target: "container", replicas: 2, healthCheckPath: "/health" }).valid).toBe(
      true,
    );
  });
});

describe("ConfigurationEngine (combined)", () => {
  it("validates environment and deployment together", () => {
    const engine = new ConfigurationEngine({
      environment: { vars: [{ key: "PORT", default: "3000" }] },
      deployment: { target: "local" },
    });
    expect(engine.validate().valid).toBe(true);
  });
});
