import type { ConfidenceLevel } from "../shared/confidence.js";

export interface DecisionFactor {
  id: string;
  label: string;
  /** Relative importance; any positive number, normalized internally. */
  weight: number;
  /** 0-1 how favorably this factor scores. */
  score: number;
}

export type DecisionContext = Record<string, unknown>;

export interface DecisionRule {
  id: string;
  description: string;
  evaluate: (context: DecisionContext) => boolean;
}

export interface RuleEvaluationResult {
  ruleId: string;
  description: string;
  passed: boolean;
}

export interface ThresholdBand {
  label: string;
  /** Inclusive lower bound (0-1) for this band. */
  min: number;
}

export interface DecisionRecord {
  id: string;
  timestamp: string;
  context: DecisionContext;
  factors: DecisionFactor[];
  score: number;
  confidenceLevel: ConfidenceLevel;
  label: string;
  ruleResults: RuleEvaluationResult[];
}

export interface DecisionHistoryFilter {
  label?: string;
  since?: string;
  limit?: number;
}
