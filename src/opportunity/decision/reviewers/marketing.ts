import type { ReviewerOutput, CourtContext } from "../types.js";
import { arg, clamp } from "./base.js";

export function reviewAsMarketing(ctx: CourtContext): ReviewerOutput {
  const { intelligence: intel } = ctx;
  const category = intel.category;
  const market = intel.marketSizeEstimate;
  const growing = intel.checks.isOpportunityGrowing;
  const existing = intel.existingSolutionScore;
  const noise = intel.noiseScore;

  const argumentsFor = [];
  const argumentsAgainst = [];

  if (growing) argumentsFor.push(arg("Growing market — content marketing rides organic wave", 0.78));
  if (existing.score >= 0.5) argumentsFor.push(arg("Existing solutions fail = clear differentiation narrative", 0.80, existing.solutionFailureSignals.slice(0, 2)));
  if (noise.score >= 0.6) argumentsFor.push(arg("High signal-to-noise ratio — category credibility achievable", 0.65));
  if (intel.sourceTrustScore.score >= 0.7) argumentsFor.push(arg("High-trust communities (G2/GitHub/SO) = earned media channels", 0.70));

  if (market.tier === "tiny") argumentsAgainst.push(arg("Tiny market — can't build brand without volume", 0.80));
  if (!growing) argumentsAgainst.push(arg("Flat trend — content won't catch tailwind", 0.60));
  if (noise.score < 0.4) argumentsAgainst.push(arg("Low signal quality — category too noisy for positioning", 0.70));

  const approve = existing.score >= 0.4 && market.score >= 0.4;
  const confidence = clamp(existing.score * 0.3 + market.score * 0.3 + noise.score * 0.2 + (growing ? 0.2 : 0));

  return {
    role: "marketing",
    argumentsFor,
    argumentsAgainst,
    evidence: [],
    assumptions: [
      "Category can be owned via SEO + community content",
      `"${category}" is searchable by ICP`,
    ],
    unknowns: ["Search volume on pain keywords", "Paid CPC in category", "PR hook angle"],
    risks: ["Broad category = undifferentiated positioning", "Existing players outspend on ads"],
    verdict: approve ? "approve" : "neutral",
    confidence,
    summary: approve
      ? `Marketing sees positionable category with ${growing ? "growing" : "stable"} demand and clear differentiation hook.`
      : `Marketing needs clearer positioning story before committing budget.`,
  };
}
