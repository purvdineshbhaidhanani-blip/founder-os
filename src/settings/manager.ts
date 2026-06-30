export interface ProviderConfig {
  id: string;
  name: string;
  defaultModel: string;
  models: string[];
  enabled: boolean;
}

export interface Limits {
  maxTokensPerTask?: number;
  maxCostPerTaskCents?: number;
  maxTokensPerDay?: number;
  maxCostPerDayCents?: number;
  rateRequestsPerMinute?: number;
}

/**
 * The single configuration surface for the company OS. Holds:
 *   - Configuration: arbitrary key/value config
 *   - Secrets: opaque strings (never logged or serialized)
 *   - Environment: imported once from process.env
 *   - Providers + Models: known LLM providers/models
 *   - Limits: cost, token, and rate guardrails
 */
export class SettingsManager {
  private config = new Map<string, unknown>();
  private secrets = new Map<string, string>();
  private providers = new Map<string, ProviderConfig>();
  private limits: Limits = {};

  set<T>(key: string, value: T): void { this.config.set(key, value); }
  get<T>(key: string): T | undefined { return this.config.get(key) as T | undefined; }
  has(key: string): boolean { return this.config.has(key); }
  listConfigKeys(): string[] { return [...this.config.keys()]; }

  setSecret(key: string, value: string): void { this.secrets.set(key, value); }
  getSecret(key: string): string | undefined { return this.secrets.get(key); }
  hasSecret(key: string): boolean { return this.secrets.has(key); }
  listSecretKeys(): string[] { return [...this.secrets.keys()]; }

  importEnv(env: Record<string, string | undefined> = process.env, prefix = ""): number {
    let imported = 0;
    for (const [key, value] of Object.entries(env)) {
      if (!value) continue;
      if (prefix && !key.startsWith(prefix)) continue;
      this.setSecret(key, value);
      imported += 1;
    }
    return imported;
  }

  addProvider(provider: ProviderConfig): void { this.providers.set(provider.id, provider); }
  getProvider(id: string): ProviderConfig | undefined { return this.providers.get(id); }
  listProviders(): ProviderConfig[] { return [...this.providers.values()]; }
  listModels(): { provider: string; model: string }[] {
    return this.listProviders().flatMap((p) => p.models.map((model) => ({ provider: p.id, model })));
  }

  setLimits(limits: Partial<Limits>): void { this.limits = { ...this.limits, ...limits }; }
  getLimits(): Limits { return this.limits; }
}
