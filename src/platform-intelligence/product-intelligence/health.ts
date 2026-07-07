import type {
  ConfigValidationResultLike,
  ConfigValidationSummary,
  DependencyHealthReport,
  HealthStatus,
  ModuleHealthReport,
  ModuleRegistryLike,
  ProductHealthReport,
} from "./types.js";

const STATUS_SEVERITY: Record<HealthStatus, number> = { healthy: 0, degraded: 1, unhealthy: 2 };

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  return statuses.reduce<HealthStatus>(
    (worst, status) => (STATUS_SEVERITY[status] > STATUS_SEVERITY[worst] ? status : worst),
    "healthy",
  );
}

/** Per-module health: unhealthy if it (as an enabled module) has an unresolved/disabled dependency; degraded if it was auto-discovered and never catalogued. */
export function computeModuleHealth(registry: ModuleRegistryLike): ModuleHealthReport[] {
  const validation = registry.validateEnabled();
  const issuesByModule = new Map<string, string[]>();
  for (const issue of validation.issues) {
    const list = issuesByModule.get(issue.nodeId) ?? [];
    list.push(issue.detail);
    issuesByModule.set(issue.nodeId, list);
  }

  return registry.enabledModules().map((module) => {
    const issues = issuesByModule.get(module.id) ?? [];
    let status: HealthStatus = "healthy";
    if (issues.length > 0) status = "unhealthy";
    else if (module.discovered) status = "degraded";
    return { moduleId: module.id, status, issues };
  });
}

export function computeDependencyHealth(registry: ModuleRegistryLike): DependencyHealthReport {
  const validation = registry.validateAll();
  return {
    status: validation.valid ? "healthy" : "unhealthy",
    issues: validation.issues.map((issue) => issue.detail),
  };
}

export function computeConfigValidation(result: ConfigValidationResultLike): ConfigValidationSummary {
  return { valid: result.valid, issues: result.issues ?? [] };
}

/**
 * Aggregates module health, dependency health, and configuration validation
 * into a single product-level health report. Depends only on structural
 * interfaces (`ModuleRegistryLike`, `ConfigValidationResultLike`) — it works
 * with the Loop 3 `ModuleRegistry`/`ConfigurationEngine`, the Intelligence
 * Registry, or any future equivalent, without importing any of them.
 */
export class ProductIntelligence {
  computeHealth(registry: ModuleRegistryLike, configValidation: ConfigValidationResultLike): ProductHealthReport {
    const moduleHealth = computeModuleHealth(registry);
    const dependencyHealth = computeDependencyHealth(registry);
    const configSummary = computeConfigValidation(configValidation);

    const status = worstStatus([
      ...moduleHealth.map((m) => m.status),
      dependencyHealth.status,
      configSummary.valid ? "healthy" : "unhealthy",
    ]);

    return {
      status,
      moduleHealth,
      configValidation: configSummary,
      dependencyHealth,
      generatedAt: new Date().toISOString(),
    };
  }
}
