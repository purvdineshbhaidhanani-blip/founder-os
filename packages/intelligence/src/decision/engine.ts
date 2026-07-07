import { classifyConfidence } from "@platform/shared";
import { InMemoryDecisionHistoryStore, type DecisionHistoryStore } from "./history.js";
import { evaluateRules } from "./rules.js";
import { weightedScore } from "./scoring.js";
import { classifyByThreshold, DEFAULT_THRESHOLD_BANDS } from "./thresholds.js";
import type { DecisionContext, DecisionFactor, DecisionHistoryFilter, DecisionRecord, DecisionRule, ThresholdBand } from "./types.js";

export interface DecisionEngineOptions {
  thresholdBands?: ThresholdBand[];
  historyStore?: DecisionHistoryStore;
}

let counter = 0;
function generateDecisionId(): string {
  counter += 1;
  return `decision_${Date.now()}_${counter}`;
}

/**
 * Generic decision framework: weighted multi-factor scoring, rule
 * evaluation, threshold-based labeling, and confidence classification, with
 * every decision recorded to history. No business rules are baked in —
 * factors, rules, and thresholds are all supplied by the caller.
 */
export class DecisionEngine {
  private readonly thresholdBands: ThresholdBand[];
  private readonly historyStore: DecisionHistoryStore;

  constructor(options: DecisionEngineOptions = {}) {
    this.thresholdBands = options.thresholdBands ?? DEFAULT_THRESHOLD_BANDS;
    this.historyStore = options.historyStore ?? new InMemoryDecisionHistoryStore();
  }

  async decide(
    context: DecisionContext,
    factors: DecisionFactor[],
    rules: DecisionRule[] = [],
  ): Promise<DecisionRecord> {
    const score = weightedScore(factors);
    const record: DecisionRecord = {
      id: generateDecisionId(),
      timestamp: new Date().toISOString(),
      context,
      factors,
      score,
      confidenceLevel: classifyConfidence(score),
      label: classifyByThreshold(score, this.thresholdBands),
      ruleResults: evaluateRules(rules, context),
    };
    await this.historyStore.record(record);
    return record;
  }

  async history(filter?: DecisionHistoryFilter): Promise<DecisionRecord[]> {
    return this.historyStore.list(filter);
  }
}
