import { nowIso } from "../utils/id.js";
import { RealityGuard } from "../intelligence/reality-guard.js";
import type { Insight } from "../intelligence/types.js";
import { computeResearchConfidence } from "./confidence.js";
import type { FounderReport, Opportunity } from "./types.js";

const guard = new RealityGuard();

export interface BuildFounderReportOptions {
  sourcesUsed: string[];
  sourcesFailed: string[];
  sourcesSkipped: string[];
  sourcesEligibleCount: number;
}

/**
 * Builds the founder-facing report from aggregated opportunities and their
 * backing insights. Any insight that fails `RealityGuard.verify()` is
 * dropped — the report only ever surfaces evidence the guard is willing to
 * stand behind.
 */
export function buildFounderReport(
  opportunities: Opportunity[],
  insights: Insight<unknown>[],
  options: BuildFounderReportOptions,
): FounderReport {
  const verifiedInsights = insights.filter((insight) => guard.verify(insight).valid);

  const primaryInsight = verifiedInsights[0];
  const confidenceScore = primaryInsight
    ? computeResearchConfidence(options.sourcesUsed.length, options.sourcesEligibleCount, primaryInsight)
    : { band: "low" as const, numericScore: 0 };

  const totalKnown = options.sourcesUsed.length + options.sourcesFailed.length + options.sourcesSkipped.length;
  const ratio = totalKnown > 0 ? options.sourcesUsed.length / totalKnown : 0;

  return {
    topOpportunities: opportunities,
    evidence: verifiedInsights,
    confidenceScore,
    sourceCoverage: {
      used: options.sourcesUsed,
      failed: options.sourcesFailed,
      skipped: options.sourcesSkipped,
      ratio: Math.round(ratio * 100) / 100,
    },
    generatedAt: nowIso(),
  };
}
