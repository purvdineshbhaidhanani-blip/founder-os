export interface FeatureFlagDefinition {
  key: string;
  description?: string;
  default: boolean;
  /** 0-100. When set, the flag is on for this percentage of subjects, deterministically by subjectId. */
  rolloutPercentage?: number;
  /** Restricts the flag to specific environments (e.g. ["development", "staging"]). Omit for all environments. */
  environments?: string[];
}

export interface FeatureFlagContext {
  subjectId?: string;
  environment?: string;
}

function hashToPercentage(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 100;
}

/**
 * Generic feature-flag evaluator: boolean defaults, percentage rollouts
 * (deterministic per subject, so a given user always lands on the same
 * side), environment scoping, and explicit overrides for admin/testing use.
 * No product-specific flags are baked in — this is pure evaluation logic.
 */
export class FeatureFlagStore {
  private readonly definitions = new Map<string, FeatureFlagDefinition>();
  private readonly overrides = new Map<string, boolean>();

  constructor(definitions: FeatureFlagDefinition[] = []) {
    for (const def of definitions) this.define(def);
  }

  define(definition: FeatureFlagDefinition): void {
    this.definitions.set(definition.key, definition);
  }

  list(): FeatureFlagDefinition[] {
    return [...this.definitions.values()];
  }

  /** Explicit override that always wins over rollout/default computation — for admin toggles or tests. */
  override(key: string, value: boolean): void {
    this.overrides.set(key, value);
  }

  clearOverride(key: string): void {
    this.overrides.delete(key);
  }

  isEnabled(key: string, context: FeatureFlagContext = {}): boolean {
    if (this.overrides.has(key)) return this.overrides.get(key)!;

    const definition = this.definitions.get(key);
    if (!definition) return false;

    if (definition.environments && context.environment && !definition.environments.includes(context.environment)) {
      return false;
    }

    if (definition.rolloutPercentage !== undefined) {
      const bucket = hashToPercentage(`${key}:${context.subjectId ?? "anonymous"}`);
      return bucket < definition.rolloutPercentage;
    }

    return definition.default;
  }
}
