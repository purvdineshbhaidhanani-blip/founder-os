export const MODULE_CATEGORIES = [
  "core",
  "ai",
  "workflow",
  "automation",
  "search",
  "knowledge",
  "notification",
  "analytics",
  "observability",
  "integration",
  "storage",
] as const;
export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

/**
 * Metadata describing one reusable platform module (a Loop 2 engine, or a
 * core foundation capability). The Module Registry, Bootstrap System, and
 * Documentation Generator all operate on this descriptor — never on the
 * module's implementation directly.
 */
export interface PlatformModule {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  /** Ids of other modules that must be present (and enabled) for this one to work. */
  dependsOn?: string[];
  /** Path to the module's source, relative to the platform root. Used for on-disk discovery/verification. */
  sourcePath?: string;
  /** True for modules auto-discovered on disk but not present in the built-in catalog. */
  discovered?: boolean;
}
