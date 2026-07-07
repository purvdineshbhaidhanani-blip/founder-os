import { validateDependencyGraph, type DependencyValidation } from "@platform/shared";
import { BUILTIN_MODULES } from "./catalog.js";
import { discoverEngineDirectories, toDiscoveredModuleName } from "./discovery.js";
import type { PlatformModule } from "./types.js";

export interface ResolvedModules {
  /** `ids` plus every transitive dependency, in dependency-first order. */
  order: string[];
  validation: DependencyValidation;
}

/**
 * Central registry of platform modules: what exists, what's enabled, and
 * whether the enabled set (or any arbitrary required-module set) is
 * dependency-consistent. The Bootstrap System, Documentation Generator, and
 * Extension System all read from this — it's the one place module state
 * lives.
 */
export class ModuleRegistry {
  private readonly modules = new Map<string, PlatformModule>();
  private readonly enabled = new Set<string>();

  constructor(initialModules: PlatformModule[] = []) {
    for (const module of initialModules) this.register(module);
  }

  /** A registry pre-seeded with every built-in Loop 1/Loop 2 module (none enabled yet). */
  static withBuiltins(): ModuleRegistry {
    return new ModuleRegistry(BUILTIN_MODULES);
  }

  register(module: PlatformModule): void {
    this.modules.set(module.id, module);
  }

  unregister(id: string): void {
    this.modules.delete(id);
    this.enabled.delete(id);
  }

  get(id: string): PlatformModule | undefined {
    return this.modules.get(id);
  }

  list(): PlatformModule[] {
    return [...this.modules.values()];
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  /**
   * Scans disk for engine directories under `<platformRoot>/packages/engines/src` and
   * registers any not already known, marked `discovered: true`. Returns the
   * newly-registered modules. Verified, on-disk modules always win over
   * stale catalog entries — if a catalog module's `sourcePath` no longer
   * exists, it stays registered (so plans can still surface the gap) but is
   * left untouched here.
   */
  discover(platformRoot?: string): PlatformModule[] {
    const found = discoverEngineDirectories(platformRoot);
    const added: PlatformModule[] = [];
    for (const engine of found) {
      if (this.modules.has(engine.id)) continue;
      const module: PlatformModule = {
        id: engine.id,
        name: toDiscoveredModuleName(engine.id),
        description: "Auto-discovered platform module.",
        category: "core",
        sourcePath: engine.sourcePath,
        discovered: true,
      };
      this.register(module);
      added.push(module);
    }
    return added;
  }

  enable(id: string): void {
    if (!this.modules.has(id)) throw new Error(`Cannot enable unknown module "${id}".`);
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

  enabledModules(): PlatformModule[] {
    return this.enabledIds()
      .map((id) => this.modules.get(id))
      .filter((m): m is PlatformModule => m !== undefined);
  }

  /** Structural validation of every registered module's dependency graph (missing deps, cycles). */
  validateAll(): DependencyValidation {
    return validateDependencyGraph(this.list());
  }

  /** Validates that everything currently enabled has all of its dependencies also enabled. */
  validateEnabled(): DependencyValidation {
    return validateDependencyGraph(this.list(), { enabledIds: this.enabled });
  }

  /**
   * Expands `requiredIds` to include every transitive dependency and
   * returns them in dependency-first order, validating the resolved subgraph
   * along the way. This is what the Bootstrap System calls to turn "modules
   * this product needs" into "modules to actually wire up, in what order."
   */
  resolveRequired(requiredIds: string[]): ResolvedModules {
    const closure = new Set<string>();
    const queue = [...requiredIds];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (closure.has(id)) continue;
      closure.add(id);
      const module = this.modules.get(id);
      for (const dep of module?.dependsOn ?? []) queue.push(dep);
    }

    const subset = [...closure].map((id) => this.modules.get(id)).filter((m): m is PlatformModule => m !== undefined);
    const missingIds = [...closure].filter((id) => !this.modules.has(id));
    const validation = validateDependencyGraph(subset);
    for (const missingId of missingIds) {
      validation.issues.push({
        nodeId: missingId,
        type: "missing-dependency",
        detail: `Required module "${missingId}" is not registered.`,
      });
    }
    return { order: validation.order, validation: { ...validation, valid: validation.issues.length === 0 } };
  }
}
