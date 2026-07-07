export interface ProviderConfigEntry {
  category: string;
  id: string;
  config: Record<string, unknown>;
}

/**
 * Generic named provider configuration, keyed by category (e.g. "ai",
 * "storage", "email") and provider id (e.g. "anthropic", "s3", "console").
 * This is what keeps a product's choice of vendor a config value instead of
 * a hardcoded import — swapping providers is a call to `setActive`, not a
 * code change.
 */
export class ProviderConfigRegistry {
  private readonly entries = new Map<string, ProviderConfigEntry>();
  private readonly active = new Map<string, string>();

  private key(category: string, id: string): string {
    return `${category}:${id}`;
  }

  register(entry: ProviderConfigEntry): void {
    this.entries.set(this.key(entry.category, entry.id), entry);
  }

  get(category: string, id: string): ProviderConfigEntry | undefined {
    return this.entries.get(this.key(category, id));
  }

  listByCategory(category: string): ProviderConfigEntry[] {
    return [...this.entries.values()].filter((e) => e.category === category);
  }

  setActive(category: string, id: string): void {
    if (!this.entries.has(this.key(category, id))) {
      throw new Error(`Cannot activate unknown provider "${id}" in category "${category}".`);
    }
    this.active.set(category, id);
  }

  getActive(category: string): ProviderConfigEntry | undefined {
    const id = this.active.get(category);
    return id ? this.entries.get(this.key(category, id)) : undefined;
  }
}
