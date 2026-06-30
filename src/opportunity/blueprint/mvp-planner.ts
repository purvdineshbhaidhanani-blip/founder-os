import type { BlueprintContext, MVPPlan, Feature } from "./types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";

// ---------------------------------------------------------------------------
// MVP Planner
// Scopes the MVP to P0 features only, derives timeline from feasibility.
// ---------------------------------------------------------------------------

export function planMVP(ctx: BlueprintContext, allFeatures: Feature[]): MVPPlan {
  const { intelligence: intel } = ctx;
  const feasibility = intel.technicalFeasibilityScore;

  const p0Features = allFeatures.filter((f) => f.priority === "P0");
  const p1Features = allFeatures.filter((f) => f.priority !== "P0");

  const mvpScope = p0Features.map((f) => f.name);
  const outOfScope = p1Features.map((f) => `${f.name} (${f.priority})`);

  const timeline = feasibility.estimatedTimeToMVP;

  const successMetrics = buildSuccessMetrics(intel);

  const targetAdopters = buildEarlyAdopterTarget(intel.category, intel.opportunityGapScore.score);

  return {
    name: "MVP — Core Pain Relief",
    scope: mvpScope,
    outOfScope,
    successMetrics,
    estimatedTimeline: `${timeline} months`,
    targetEarlyAdopters: targetAdopters,
  };
}

function buildSuccessMetrics(intel: OpportunityIntelligence): string[] {
  const hoursSaved = intel.humanTimeSavedScore.estimatedHoursPerWeekPerUser;
  return [
    `10 paying customers within 60 days of launch`,
    `$${Math.round(hoursSaved * 75 * 0.1)} MRR target at 30 days`,
    `User activation: complete core workflow within 10 minutes of signup`,
    `NPS ≥ 40 from first 20 users`,
    `Churn < 5% in first 3 months`,
  ];
}

function buildEarlyAdopterTarget(category: string, gap: number): string {
  const urgency = gap >= 0.65 ? "high-pain early adopters who already tried alternatives" : "pragmatic users open to new tools";
  return `${category.replace("-", " ")} practitioners — ${urgency} — reachable via Reddit/GitHub/Slack communities`;
}
