import { validateDependencyGraph, type DependencyValidation } from "../../factory/shared/dependency-graph.js";
import { BUILTIN_INTELLIGENCE_MODULES } from "./catalog.js";
import { discoverIntelligenceDirectories, toDiscoveredModuleName } from "./discovery.js";
import { satisfiesMinVersion } from "./semver.js";
import type { IntelligenceModuleDescriptor } from "./types.js";

/**
 * Central registry for intelligence modules: registration, on-disk
 * discovery, enable/disable, and version compatibility checks. Dependency
 * validation reuses the exact same `validateDependencyGraph` the Loop 3
 * Module Registry uses — one dependency-graph algorithm for the whole
 * platform, not a second copy for intelligence modules.
 */
export class IntelligenceRegistry {
  private readonly modules = new Map<string, IntelligenceModuleDescriptor>();
  private readonly enabled = new Set<string>();

  constructor(initialModules: IntelligenceModuleDescriptor[] = []) {
    for (const module of initialModules) this.register(module);
  }

  static withBuiltins(): IntelligenceRegistry {
    return new IntelligenceRegistry(BUILTIN_INTELLIGENCE_MODULES);
  }

  register(module: IntelligenceModuleDescriptor): void {
    this.modules.set(module.id, module);
  }

  unregister(id: string): void {
    this.modules.delete(id);
    this.enabled.delete(id);
  }

  get(id: string): IntelligenceModuleDescriptor | undefined {
    return this.modules.get(id);
  }

  list(): IntelligenceModuleDescriptor[] {
    return [...this.modules.values()];
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  /** Scans disk for module directories not already known and registers them, marked `discovered: true`. */
  discover(platformRoot?: string): IntelligenceModuleDescriptor[] {
    const found = discoverIntelligenceDirectories(platformRoot);
    const added: IntelligenceModuleDescriptor[] = [];
    for (const dir of found) {
      if (this.modules.has(dir.id)) continue;
      const module: IntelligenceModuleDescriptor = {
        id: dir.id,
        name: toDiscoveredModuleName(dir.id),
        description: "Auto-discovered intelligence module.",
        version: "0.0.0",
        category: "diagnostics",
        sourcePath: dir.sourcePath,
        discovered: true,
      };
      this.register(module);
      added.push(module);
    }
    return added;
  }

  enable(id: string): void {
    if (!this.modules.has(id)) throw new Error(`Cannot enable unknown intelligence module "${id}".`);
    this.enabled.add(id);
  }

  disable(id: string): void {
    this.enabled.delete(id);
  }

  isEnabled(id: string): boolean {
    return this.enabled.has(id);
  }

  enabledIds(): string[] {
    return [...this.enabled];
  }

  enabledModules(): IntelligenceModuleDescriptor[] {
    return this.enabledIds()
      .map((id) => this.modules.get(id))
      .filter((m): m is IntelligenceModuleDescriptor => m !== undefined);
  }

  validateAll(): DependencyValidation {
    return validateDependencyGraph(this.list());
  }

  validateEnabled(): DependencyValidation {
    return validateDependencyGraph(this.list(), { enabledIds: this.enabled });
  }

  /** Checks a registered module's version against a minimum required version — the "Versioning" capability. */
  isVersionCompatible(id: string, minVersion: string): boolean {
    const module = this.modules.get(id);
    if (!module) return false;
    return satisfiesMinVersion(module.version, minVersion);
  }
}
