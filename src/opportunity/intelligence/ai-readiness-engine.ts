import type { ContentCategory, SignalType } from "../types.js";
import type { AIReadinessScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// AI Readiness Engine
// Score: 1 = AI obviously and immediately solves this today
//        0 = AI cannot help (hardware, physical, regulatory void)
// ---------------------------------------------------------------------------

// How well each signal type maps to AI capabilities
const SIGNAL_TYPE_AI_FIT: Record<SignalType, number> = {
  "automation-request": 0.95,  // AI automation is mature
  "manual-process": 0.90,      // AI can replace manual work
  "repeated-task": 0.90,       // RPA + AI handles this well
  "workaround": 0.85,          // AI agent can eliminate workarounds
  "time-loss": 0.80,           // AI speed-up
  "workflow": 0.80,            // AI orchestration
  "integration-pain": 0.75,    // AI agents can bridge APIs
  "missing-feature": 0.70,     // AI can fill feature gaps
  "api-gap": 0.65,             // AI can wrap non-API surfaces
  "problem": 0.60,             // generic — depends
  "complaint": 0.55,           // depends on what was complained about
  "request": 0.65,             // request suggests something buildable
  "money-loss": 0.70,          // AI can cut operational costs
  "bug": 0.45,                 // AI can detect bugs but not always fix root cause
};

// Category AI fit — some domains are more AI-native today
const CATEGORY_AI_FIT: Record<ContentCategory, number> = {
  "ai": 0.98,
  "automation": 0.95,
  "developer-tools": 0.88,
  "productivity": 0.85,
  "no-code": 0.82,
  "low-code": 0.82,
  "saas": 0.78,
  "apis": 0.80,
  "devops": 0.78,
  "cloud": 0.72,
  "operations": 0.75,
  "sales": 0.73,
  "marketing": 0.75,
  "finance": 0.68,
  "hr": 0.68,
  "business": 0.70,
  "enterprise": 0.65,
  "cybersecurity": 0.65,
  "software": 0.75,
  "professional-services": 0.68,
  "creator-economy": 0.78,
  "legal-tech": 0.60,
  "healthcare-tech": 0.55,
  "construction-tech": 0.50,
  "manufacturing": 0.52,
  "other": 0.55,
};

// Text patterns that boost AI readiness
const HIGH_AI_FIT_RE = /\b(text (processing|extraction|analysis)|document (parsing|understanding|classification)|summariz|transcri(be|pt|ption)|classify|categoriz|generate|predict|extract (data|fields|info)|automate|pattern|nlp|ocr|voice|speech)\b/i;

// Text patterns that reduce AI readiness (hardware, physical world, regulatory void)
const LOW_AI_FIT_RE = /\b(physical (device|hardware|equipment)|sensor|robot|drone|3d print|assembly line|supply (physical)|require (license|certification)|fda approval|medical device)\b/i;

export function scoreAIReadiness(ctx: ScoringContext): AIReadinessScore {
  const { opportunity, allText } = ctx;

  // Signal type average
  const signalTypes = opportunity.evidence.map((e) => e.signalType);
  const avgSignalFit =
    signalTypes.length > 0
      ? signalTypes.reduce((s, t) => s + (SIGNAL_TYPE_AI_FIT[t] ?? 0.55), 0) / signalTypes.length
      : 0.5;

  // Category fit
  const categoryFit = CATEGORY_AI_FIT[opportunity.category] ?? 0.55;

  // Text signal modifiers
  const textBonus = HIGH_AI_FIT_RE.test(allText) ? 0.1 : 0;
  const textPenalty = LOW_AI_FIT_RE.test(allText) ? 0.2 : 0;

  // Workaround bonus — manual workarounds are directly replaceable by AI
  const workaroundBonus = Math.min(0.1, opportunity.workaroundsDetected.length * 0.03);

  let score = (avgSignalFit * 0.45 + categoryFit * 0.45) + textBonus - textPenalty + workaroundBonus;
  score = Math.max(0, Math.min(1, score));

  const rationale = buildRationale(opportunity.category, signalTypes[0] ?? "problem", score, textBonus > 0, textPenalty > 0);

  return { score, rationale };
}

function buildRationale(
  category: ContentCategory,
  primarySignal: SignalType,
  score: number,
  hasAIKeywords: boolean,
  hasHardwareKeywords: boolean,
): string {
  if (score >= 0.85) return `${category} + ${primarySignal} = strong AI automation fit${hasAIKeywords ? "; text processing/NLP detected" : ""}`;
  if (score >= 0.65) return `${category} + ${primarySignal} = moderate AI fit; requires data + integration work`;
  if (score <= 0.35) return `${category} + ${primarySignal} = low AI fit${hasHardwareKeywords ? "; hardware/physical components detected" : ""}`;
  return `${category} + ${primarySignal} = partial AI fit; specialized domain knowledge required`;
}
