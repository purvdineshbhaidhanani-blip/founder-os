export const HEALTH_STATUSES = ["healthy", "degraded", "unhealthy"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

export interface ModuleHealthReport {
  moduleId: string;
  status: HealthStatus;
  issues: string[];
}

export interface ConfigValidationSummary {
  valid: boolean;
  issues: Array<{ path: string; message: string }>;
}

export interface DependencyHealthReport {
  status: HealthStatus;
  issues: string[];
}

export interface ProductHealthReport {
  status: HealthStatus;
  moduleHealth: ModuleHealthReport[];
  configValidation: ConfigValidationSummary;
  dependencyHealth: DependencyHealthReport;
  generatedAt: string;
}

/** Structural shape of a dependency-graph issue — matches both the Loop 3 Module Registry and the Intelligence Registry without importing either. */
export interface DependencyIssueLike {
  nodeId: string;
  detail: string;
}

export interface DependencyValidationLike {
  valid: boolean;
  issues: DependencyIssueLike[];
}

/** Structural shape any module registry (platform or intelligence) satisfies — no hard import needed. */
export interface ModuleRegistryLike {
  list(): Array<{ id: string; discovered?: boolean }>;
  enabledModules(): Array<{ id: string; discovered?: boolean }>;
  validateEnabled(): DependencyValidationLike;
  validateAll(): DependencyValidationLike;
}

/** Structural shape any configuration validation result satisfies (e.g. the Loop 3 `ConfigurationEngine.validate()` return). */
export interface ConfigValidationResultLike {
  valid: boolean;
  issues?: Array<{ path: string; message: string }>;
}
