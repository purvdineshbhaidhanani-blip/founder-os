import { validateDeploymentConfig, type DeploymentConfig } from "./deployment.js";
import { EnvironmentConfig, type EnvironmentConfigOptions } from "./env.js";
import { FeatureFlagStore, type FeatureFlagDefinition } from "./features.js";
import { ProviderConfigRegistry } from "./providers.js";
import type { ValidationResult } from "@platform/shared";

export interface ConfigurationEngineOptions {
  environment: EnvironmentConfigOptions;
  features?: FeatureFlagDefinition[];
  deployment: DeploymentConfig;
}

/**
 * Single entry point combining the four configuration surfaces a product
 * needs: environment variables, feature flags, provider selection, and
 * deployment settings. Constructed once per product; every module reads
 * from this instead of touching `process.env` or a vendor SDK directly.
 */
export class ConfigurationEngine {
  readonly environment: EnvironmentConfig;
  readonly features: FeatureFlagStore;
  readonly providers: ProviderConfigRegistry;
  readonly deployment: DeploymentConfig;

  constructor(options: ConfigurationEngineOptions) {
    this.environment = new EnvironmentConfig(options.environment);
    this.features = new FeatureFlagStore(options.features);
    this.providers = new ProviderConfigRegistry();
    this.deployment = options.deployment;
  }

  validate(): ValidationResult<{ environment: Record<string, string>; deployment: DeploymentConfig }> {
    const envResult = this.environment.validate();
    const deploymentResult = validateDeploymentConfig(this.deployment);

    const issues = [
      ...(envResult.valid ? [] : envResult.issues),
      ...(deploymentResult.valid ? [] : deploymentResult.issues),
    ];
    if (issues.length > 0) return { valid: false, issues };

    return {
      valid: true,
      value: {
        environment: (envResult as { valid: true; value: Record<string, string> }).value,
        deployment: this.deployment,
      },
    };
  }
}
