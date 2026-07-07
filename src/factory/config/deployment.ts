import type { ValidationIssue, ValidationResult } from "../shared/validation.js";

export const DEPLOYMENT_TARGETS = ["local", "container", "serverless", "static"] as const;
export type DeploymentTarget = (typeof DEPLOYMENT_TARGETS)[number];

export interface DeploymentConfig {
  target: DeploymentTarget;
  region?: string;
  replicas?: number;
  environmentVariables?: Record<string, string>;
  healthCheckPath?: string;
}

/** Validates a deployment config's internal consistency (not against any specific cloud provider). */
export function validateDeploymentConfig(config: DeploymentConfig): ValidationResult<DeploymentConfig> {
  const issues: ValidationIssue[] = [];

  if (config.replicas !== undefined && config.replicas < 1) {
    issues.push({ path: "replicas", message: "replicas must be at least 1." });
  }
  if (config.target === "static" && config.replicas !== undefined) {
    issues.push({ path: "replicas", message: "static deployments are not replicated; omit replicas." });
  }
  if ((config.target === "container" || config.target === "serverless") && !config.healthCheckPath) {
    issues.push({ path: "healthCheckPath", message: `${config.target} deployments should declare a health check path.` });
  }

  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, value: config };
}
