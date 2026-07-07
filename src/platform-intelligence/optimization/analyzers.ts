import type {
  OptimizableModule,
  OptimizationContext,
  OptimizationDraft,
} from "./types.js";

/** Generic platform-quality pairings: operational modules paired with observability. Not business/market-specific — purely about the platform's own engines. */
const COMMON_PAIRINGS: Record<string, string> = {
  ai: "logging-monitoring",
  automation: "logging-monitoring",
  integration: "logging-monitoring",
  storage: "logging-monitoring",
};

function computeDependents(all: OptimizableModule[]): Map<string, string[]> {
  const dependents = new Map<string, string[]>();
  for (const module of all) {
    for (const dep of module.dependsOn ?? []) {
      const list = dependents.get(dep) ?? [];
      list.push(module.id);
      dependents.set(dep, list);
    }
  }
  return dependents;
}

export function analyzeModuleSelection(context: OptimizationContext): OptimizationDraft[] {
  if (!context.moduleRegistry) return [];
  const drafts: OptimizationDraft[] = [];
  const enabled = context.moduleRegistry.enabledModules();
  const enabledIds = new Set(enabled.map((m) => m.id));
  const dependents = computeDependents(context.moduleRegistry.list());
  const requiredSet = new Set(context.requiredModuleIds ?? []);

  if (requiredSet.size > 0) {
    for (const module of enabled) {
      const hasDependents = (dependents.get(module.id) ?? []).some((id) => enabledIds.has(id));
      if (!hasDependents && !requiredSet.has(module.id)) {
        drafts.push({
          category: "module-selection",
          title: `Review whether "${module.id}" is still needed`,
          description: `"${module.id}" is enabled, has no other enabled module depending on it, and is not in the product's required module list.`,
          impact: "low",
          confidence: 0.5,
        });
      }
    }
  }

  for (const [trigger, companion] of Object.entries(COMMON_PAIRINGS)) {
    if (enabledIds.has(trigger) && !enabledIds.has(companion)) {
      drafts.push({
        category: "module-selection",
        title: `Consider enabling "${companion}" alongside "${trigger}"`,
        description: `Products using "${trigger}" typically also enable "${companion}" for observability into its behavior.`,
        impact: "medium",
        confidence: 0.5,
      });
    }
  }

  return drafts;
}

export function analyzeSimplification(context: OptimizationContext): OptimizationDraft[] {
  if (!context.moduleRegistry) return [];
  const threshold = context.simplificationThreshold ?? 8;
  const enabled = context.moduleRegistry.enabledModules();

  if (enabled.length <= threshold) return [];

  return [
    {
      category: "simplification",
      title: "Consider consolidating enabled modules",
      description: `${enabled.length} modules are enabled, above the simplification threshold of ${threshold}. Review whether all are still earning their place.`,
      impact: "medium",
      confidence: 0.5,
    },
  ];
}

export function analyzePerformance(context: OptimizationContext): OptimizationDraft[] {
  return (context.performanceSignals ?? []).flatMap((signal): OptimizationDraft[] => {
    if (signal.criticalAbove !== undefined && signal.value >= signal.criticalAbove) {
      return [
        {
          category: "performance",
          title: `Investigate "${signal.label}"`,
          description: `${signal.label} is ${signal.value}, at or above the critical threshold of ${signal.criticalAbove}. This is likely impacting user-facing latency or reliability.`,
          impact: "high",
          confidence: 0.75,
        },
      ];
    }
    if (signal.warnAbove !== undefined && signal.value >= signal.warnAbove) {
      return [
        {
          category: "performance",
          title: `Monitor "${signal.label}"`,
          description: `${signal.label} is ${signal.value}, above the warning threshold of ${signal.warnAbove}.`,
          impact: "medium",
          confidence: 0.6,
        },
      ];
    }
    return [];
  });
}

export function analyzeCost(context: OptimizationContext): OptimizationDraft[] {
  return (context.costSignals ?? []).flatMap((signal): OptimizationDraft[] => {
    if (signal.monthlyCostUsd <= signal.threshold) return [];
    const ratio = signal.monthlyCostUsd / signal.threshold;
    return [
      {
        category: "cost",
        title: `Review spend on "${signal.label}"`,
        description: `"${signal.label}" costs an estimated $${signal.monthlyCostUsd.toFixed(2)}/mo, ${ratio.toFixed(1)}x its $${signal.threshold.toFixed(2)} budget. Consider a lower tier, reduced usage, or a different provider.`,
        impact: ratio >= 2 ? "high" : "medium",
        confidence: 0.6,
      },
    ];
  });
}

export const DEFAULT_OPTIMIZATION_ANALYZERS = [
  analyzeModuleSelection,
  analyzeSimplification,
  analyzePerformance,
  analyzeCost,
];
