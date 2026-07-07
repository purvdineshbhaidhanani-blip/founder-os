import type { PlatformModule } from "../modules/types.js";

export interface ExtensionContext {
  log: (message: string) => void;
}

export type ExtensionLifecycleHook = (context: ExtensionContext) => void | Promise<void>;

/**
 * The contract a plugin, custom module, or third-party extension must
 * satisfy to be loaded by the factory. An extension can optionally supply
 * its own `PlatformModule`s, so installing it can extend the Module
 * Registry's catalog at runtime instead of only at build time.
 */
export interface Extension {
  id: string;
  name: string;
  version: string;
  description?: string;
  /** Ids of other extensions or platform modules that must be present first. */
  dependsOn?: string[];
  modules?: PlatformModule[];
  onInstall?: ExtensionLifecycleHook;
  onEnable?: ExtensionLifecycleHook;
  onDisable?: ExtensionLifecycleHook;
  onUninstall?: ExtensionLifecycleHook;
}

export type ExtensionState = "registered" | "installed" | "enabled";
