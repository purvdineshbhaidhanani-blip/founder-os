import type { ContentCategory } from "../types.js";
import type { TechnicalFeasibilityScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Technical Feasibility Engine
// Can a small startup (2–5 engineers) build an MVP in ≤6 months?
// Score: 1 = trivially buildable; 0 = impossible / requires massive R&D.
// ---------------------------------------------------------------------------

// Categories with known build complexity
const CATEGORY_FEASIBILITY: Record<ContentCategory, { score: number; team: number; months: string }> = {
  "developer-tools": { score: 0.92, team: 2, months: "1-3" },
  "apis": { score: 0.90, team: 2, months: "1-3" },
  "automation": { score: 0.88, team: 2, months: "2-4" },
  "no-code": { score: 0.85, team: 3, months: "2-4" },
  "low-code": { score: 0.85, team: 3, months: "2-4" },
  "productivity": { score: 0.82, team: 2, months: "2-4" },
  "saas": { score: 0.80, team: 3, months: "2-5" },
  "software": { score: 0.80, team: 2, months: "2-4" },
  "devops": { score: 0.78, team: 3, months: "3-5" },
  "cloud": { score: 0.75, team: 3, months: "3-6" },
  "ai": { score: 0.72, team: 3, months: "3-6" },
  "creator-economy": { score: 0.75, team: 2, months: "2-4" },
  "operations": { score: 0.73, team: 3, months: "3-6" },
  "professional-services": { score: 0.72, team: 2, months: "2-5" },
  "sales": { score: 0.72, team: 3, months: "3-6" },
  "marketing": { score: 0.72, team: 3, months: "3-6" },
  "hr": { score: 0.68, team: 3, months: "4-7" },
  "finance": { score: 0.62, team: 4, months: "5-9" },
  "business": { score: 0.68, team: 3, months: "3-7" },
  "enterprise": { score: 0.60, team: 4, months: "6-12" },
  "legal-tech": { score: 0.55, team: 4, months: "6-12" },
  "cybersecurity": { score: 0.55, team: 4, months: "6-12" },
  "healthcare-tech": { score: 0.45, team: 5, months: "9-18" },
  "construction-tech": { score: 0.50, team: 4, months: "6-12" },
  "manufacturing": { score: 0.48, team: 5, months: "8-15" },
  "other": { score: 0.60, team: 3, months: "4-8" },
};

// Patterns that increase complexity (reduce feasibility)
const HIGH_COMPLEXITY_RE = /\b(real.?time|sub.?millisecond|hardware integration|embedded system|regulatory approval|fda|hipaa compliance|pci dss|custom silicon|distributed consensus|formal verification)\b/i;

// Patterns that reduce complexity (increase feasibility)
const LOW_COMPLEXITY_RE = /\b(crud|dashboard|reporting|webhook|api wrapper|browser extension|cli tool|script|automation|workflow builder|integration platform)\b/i;

// Legal risk patterns
const HIGH_LEGAL_RISK_RE = /\b(medical diagnosis|financial advice|legal advice|drug|prescription|clinical trial|regulated financial product|gambling|weapons?|surveillance|biometric data|children's data|coppa|gdpr sensitive)\b/i;
const MEDIUM_LEGAL_RISK_RE = /\b(healthcare|medical record|ehr|hipaa|fintech|crypto|securities|gdpr|pii|personal data|privacy|insurance)\b/i;

export function scoreTechnicalFeasibility(ctx: ScoringContext): TechnicalFeasibilityScore {
  const { opportunity, allText } = ctx;
  const base = CATEGORY_FEASIBILITY[opportunity.category] ?? CATEGORY_FEASIBILITY["other"]!;

  let score = base.score;
  let teamSize = base.team;
  let timeToMVP = base.months;

  if (HIGH_COMPLEXITY_RE.test(allText)) {
    score *= 0.65;
    teamSize += 2;
    timeToMVP = "12-24+";
  } else if (LOW_COMPLEXITY_RE.test(allText)) {
    score = Math.min(0.95, score * 1.15);
    teamSize = Math.max(1, teamSize - 1);
  }

  // Integration-only problems are easier to build than novel algorithms
  const integrationSignalFraction =
    opportunity.evidence.filter((e) => e.signalType === "integration-pain" || e.signalType === "api-gap").length /
    Math.max(1, opportunity.evidence.length);
  if (integrationSignalFraction > 0.5) {
    score = Math.min(0.9, score * 1.1);
  }

  // Legal risk
  let legalRiskLevel: TechnicalFeasibilityScore["legalRiskLevel"];
  if (HIGH_LEGAL_RISK_RE.test(allText)) {
    legalRiskLevel = "high";
    score *= 0.7;
  } else if (MEDIUM_LEGAL_RISK_RE.test(allText)) {
    legalRiskLevel = "medium";
    score *= 0.88;
  } else {
    legalRiskLevel = "low";
  }

  score = Math.max(0, Math.min(1, score));

  const rationale = buildRationale(opportunity.category, score, legalRiskLevel);
  return {
    score,
    estimatedTeamSize: teamSize,
    estimatedTimeToMVP: timeToMVP + " months",
    legalRiskLevel,
    rationale,
  };
}

function buildRationale(category: ContentCategory, score: number, legal: string): string {
  if (score >= 0.8) return `${category} — pure software, buildable by small team, low regulatory friction`;
  if (score >= 0.6) return `${category} — buildable with moderate complexity; ${legal} legal risk`;
  if (score >= 0.4) return `${category} — significant complexity; ${legal} legal risk; specialised team needed`;
  return `${category} — high build complexity or regulatory barriers; ${legal} legal risk`;
}
