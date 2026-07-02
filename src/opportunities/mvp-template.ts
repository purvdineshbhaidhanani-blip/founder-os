import type { ProblemCategory } from "../problems/types.js";

/**
 * Fixed per-category MVP recommendation templates — never free-form
 * generated, so downstream consumers can rely on exact string matching.
 */
const MVP_TEMPLATES: Record<ProblemCategory, string> = {
  "pricing-complaint":
    "A lower-cost alternative or pricing tier that directly targets the pricing gap described in the evidence.",
  "missing-capability":
    "A minimal tool or feature that adds the specific missing capability described in the representative evidence.",
  "feature-request":
    "A focused product that ships the most-requested feature first, deferring everything else.",
  "workflow-friction":
    "A streamlined workflow tool that removes the specific friction steps described in the evidence.",
  bug: "Not a new-product opportunity — this signals a quality gap in an existing product, not a build opportunity.",
  migration:
    "A migration-friendly alternative that specifically addresses why users are leaving the incumbent.",
  "looking-for-alternative":
    "A direct alternative product targeting users actively searching for a replacement.",
  "buying-intent": "A paid product or paid tier — evidence shows explicit willingness to pay.",
  complaint:
    "Unclear MVP shape from general dissatisfaction alone — needs further problem-discovery before scoping.",
  praise: "Not a build opportunity — evidence shows satisfaction, not unmet need.",
  trend:
    "A product riding the rising-mention trend identified in this evidence window — validate urgency before committing.",
  "market-gap":
    "A net-new product addressing a problem space with no existing solution — validate the gap is real, not just unsearched.",
  workaround:
    "A purpose-built product that replaces the manual workaround described in the evidence — a stronger signal than a complaint.",
  "existing-spending":
    "A product that captures already-allocated budget by directly displacing the tool users report currently paying for.",
  other: "Insufficient category signal to recommend an MVP shape.",
};

export function getRecommendedMvp(category: ProblemCategory): string {
  return MVP_TEMPLATES[category];
}

export function getTargetUsers(category: ProblemCategory, topSourceId: string): string {
  return `People active on ${topSourceId} discussing ${category.replace(/-/g, " ")} — evidence-derived, not a demographic profile.`;
}
