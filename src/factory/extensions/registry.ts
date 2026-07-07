import { validateDependencyGraph, type DependencyValidation } from "../shared/dependency-graph.js";
import type { ModuleRegistry } from "../modules/registry.js";
import type { Extension, ExtensionContext, ExtensionState } from "./types.js";

export interface ExtensionRegistryOptions {
  /** When provided, an extension's `modules` are registered here on install. */
  moduleRegistry?: ModuleRegistry;
  onLog?: (extensionId: string, message: string) => void;
}

/**
 * Registers, installs, enables, and uninstalls extensions (plugins, custom
 * modules, third-party add-ons). Dependency validation reuses the same
 * `validateDependencyGraph` the Module Registry uses, so an extension can
 * depend on either another extension or a platform module and get the same
 * missing-dependency/cycle checking either way.
 */
export class ExtensionRegistry {
  private readonly extensions = new Map<string, Extension>();
  private readonly states = new Map<string, ExtensionState>();

  constructor(private readonly options: ExtensionRegistryOptions = {}) {}

  register(extension: Extension): void {
    this.extensions.set(extension.id, extension);
    if (!this.states.has(extension.id)) this.states.set(extension.id, "registered");
  }

  get(id: string): Extension | undefined {
    return this.extensions.get(id);
  }

  list(): Extension[] {
    return [...this.extensions.values()];
  }

  state(id: string): ExtensionState | undefined {
    return this.states.get(id);
  }

  isInstalled(id: string): boolean {
    return this.states.get(id) !== "registered" && this.states.has(id);
  }

  isEnabled(id: string): boolean {
    return this.states.get(id) === "enabled";
  }

  /**
   * Validates every registered extension's dependencies against both other
   * extensions and modules in the associated `ModuleRegistry` (if any).
   */
  validateDependencies(): DependencyValidation {
    const moduleIds = new Set(this.options.moduleRegistry?.list().map((m) => m.id) ?? []);
    const nodes = [
      ...this.list().map((ext) => ({ id: ext.id, dependsOn: ext.dependsOn })),
      ...[...moduleIds].map((id) => ({ id })),
    ];
    return validateDependencyGraph(nodes);
  }

  private context(extension: Extension): ExtensionContext {
    return { log: (message) => this.options.onLog?.(extension.id, message) };
  }

  async install(id: string): Promise<void> {
    const extension = this.requireExtension(id);
    const validation = this.validateDependencies();
    const ownIssues = validation.issues.filter((issue) => issue.nodeId === id);
    if (ownIssues.length > 0) {
      throw new Error(`Cannot install "${id}": ${ownIssues.map((i) => i.detail).join("; ")}`);
    }

    await extension.onInstall?.(this.context(extension));
    for (const module of extension.modules ?? []) this.options.moduleRegistry?.register(module);
    this.states.set(id, "installed");
  }

  async enable(id: string): Promise<void> {
    const extension = this.requireExtension(id);
    if (!this.isInstalled(id)) throw new Error(`Cannot enable "${id}": it is not installed.`);
    await extension.onEnable?.(this.context(extension));
    this.states.set(id, "enabled");
    for (const module of extension.modules ?? []) this.options.moduleRegistry?.enable(module.id);
  }

  async disable(id: string): Promise<void> {
    const extension = this.requireExtension(id);
    await extension.onDisable?.(this.context(extension));
    this.states.set(id, "installed");
    for (const module of extension.modules ?? []) this.options.moduleRegistry?.disable(module.id);
  }

  async uninstall(id: string): Promise<void> {
    const extension = this.requireExtension(id);
    await extension.onUninstall?.(this.context(extension));
    for (const module of extension.modules ?? []) this.options.moduleRegistry?.unregister(module.id);
    this.states.set(id, "registered");
  }

  private requireExtension(id: string): Extension {
    const extension = this.extensions.get(id);
    if (!extension) throw new Error(`Unknown extension "${id}".`);
    return extension;
  }
}
