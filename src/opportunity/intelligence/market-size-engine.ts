import type { ContentCategory } from "../types.js";
import type { MarketSizeEstimate, MarketSizeTier, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Market Size Intelligence Engine
// Category-level TAM estimates derived from published industry research.
// Returns a tier + rough TAM + 0–1 score (1 = massive market).
// ---------------------------------------------------------------------------

interface CategoryTAM {
  tamBillions: number;   // upper bound, rough order of magnitude
  tier: MarketSizeTier;
  rationale: string;
}

const CATEGORY_TAM: Record<ContentCategory, CategoryTAM> = {
  "ai": { tamBillions: 300, tier: "massive", rationale: "AI software market >$300B by 2026 (Gartner)" },
  "cybersecurity": { tamBillions: 250, tier: "massive", rationale: "Global cybersecurity market ~$250B" },
  "healthcare-tech": { tamBillions: 250, tier: "massive", rationale: "Digital health market ~$250B" },
  "enterprise": { tamBillions: 200, tier: "massive", rationale: "Enterprise software >$700B" },
  "saas": { tamBillions: 200, tier: "massive", rationale: "SaaS market ~$200B+" },
  "cloud": { tamBillions: 180, tier: "massive", rationale: "Cloud services >$600B" },
  "finance": { tamBillions: 150, tier: "massive", rationale: "Fintech TAM ~$150B" },
  "devops": { tamBillions: 100, tier: "massive", rationale: "DevOps market ~$100B" },
  "automation": { tamBillions: 90, tier: "massive", rationale: "Industrial + RPA automation ~$90B" },
  "business": { tamBillions: 80, tier: "large", rationale: "Business software broadly ~$80B+" },
  "marketing": { tamBillions: 70, tier: "large", rationale: "MarTech stack ~$70B" },
  "sales": { tamBillions: 60, tier: "large", rationale: "Sales software ~$60B" },
  "manufacturing": { tamBillions: 55, tier: "large", rationale: "Industry 4.0 software ~$55B" },
  "productivity": { tamBillions: 50, tier: "large", rationale: "Productivity tools ~$50B" },
  "hr": { tamBillions: 45, tier: "large", rationale: "HR tech ~$45B" },
  "operations": { tamBillions: 40, tier: "large", rationale: "Ops + supply chain software ~$40B" },
  "developer-tools": { tamBillions: 30, tier: "large", rationale: "Dev tools ~$30B" },
  "apis": { tamBillions: 25, tier: "medium", rationale: "API management / infra ~$25B" },
  "software": { tamBillions: 25, tier: "medium", rationale: "General software tooling" },
  "legal-tech": { tamBillions: 22, tier: "medium", rationale: "LegalTech ~$22B" },
  "construction-tech": { tamBillions: 18, tier: "medium", rationale: "ConTech ~$18B" },
  "no-code": { tamBillions: 15, tier: "medium", rationale: "No-code / low-code platforms ~$15B" },
  "low-code": { tamBillions: 15, tier: "medium", rationale: "No-code / low-code platforms ~$15B" },
  "professional-services": { tamBillions: 12, tier: "medium", rationale: "Professional services automation ~$12B" },
  "creator-economy": { tamBillions: 10, tier: "medium", rationale: "Creator economy tools ~$10B" },
  "other": { tamBillions: 5, tier: "small", rationale: "Unclassified market" },
};

const TIER_SCORE: Record<MarketSizeTier, number> = {
  massive: 1.0,
  large: 0.8,
  medium: 0.6,
  small: 0.35,
  tiny: 0.1,
};

// Buying intent signals scale the estimate up (signal of willingness to pay = confirmed demand)
const BUYING_INTENT_MULTIPLIER = 1.2;

// Keywords in evidence that suggest market is growing
const GROWTH_RE = /\b(growing|explosive|accelerating|doubling|rapidly|boom|surge|increase|expanding)\b/i;

export function scoreMarketSize(ctx: ScoringContext): MarketSizeEstimate {
  const { opportunity, allText } = ctx;
  const base = CATEGORY_TAM[opportunity.category] ?? CATEGORY_TAM["other"]!;

  let tam = base.tamBillions;
  let { tier } = base;

  // Boost for buying intent (signals real demand, not just complaints)
  if (opportunity.buyingIntentSignals > 0) {
    tam *= BUYING_INTENT_MULTIPLIER;
  }

  // Growing market boosts tier one level
  if (GROWTH_RE.test(allText) && tier !== "massive") {
    tier = bumpTier(tier);
    tam *= 1.15;
  }

  // Multi-source and high signal count = problem affects many users = bigger market
  if (opportunity.sources.length >= 3 && opportunity.signalCount >= 5) {
    tam *= 1.1;
  }

  const score = TIER_SCORE[tier];
  const rationale = `${base.rationale}${opportunity.buyingIntentSignals > 0 ? " (buying intent confirmed)" : ""}`;

  return { tier, estimatedTAMBillions: Math.round(tam), score, rationale };
}

function bumpTier(tier: MarketSizeTier): MarketSizeTier {
  const ORDER: MarketSizeTier[] = ["tiny", "small", "medium", "large", "massive"];
  const idx = ORDER.indexOf(tier);
  return ORDER[Math.min(idx + 1, ORDER.length - 1)] ?? tier;
}
