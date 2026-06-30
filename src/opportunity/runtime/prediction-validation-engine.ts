import { generateId, nowIso } from "../../utils/id.js";
import type { CourtVerdict } from "../decision/types.js";
import type { PredictionRecord } from "./types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Prediction Validation Engine — tracks predictions vs reality
// ---------------------------------------------------------------------------

const SIGNIFICANT_DRIFT = 0.15;

export class PredictionValidationEngine {
  private readonly predictions = new Map<string, PredictionRecord>();

  constructor(private readonly audit: AuditLog) {}

  record(
    opportunityId: string,
    predictedScore: number,
    predictedVerdict: CourtVerdict,
  ): PredictionRecord {
    const prediction: PredictionRecord = {
      id: generateId("pred"),
      opportunityId,
      scoredAt: nowIso(),
      predictedScore,
      predictedVerdict,
      validatedAt: null,
      validationScore: null,
      drift: null,
    };
    this.predictions.set(opportunityId, prediction);
    return prediction;
  }

  validate(opportunityId: string, actualScore: number): PredictionRecord | null {
    const prediction = this.predictions.get(opportunityId);
    if (!prediction) return null;

    prediction.validatedAt = nowIso();
    prediction.validationScore = actualScore;
    prediction.drift = actualScore - prediction.predictedScore;

    if (Math.abs(prediction.drift) >= SIGNIFICANT_DRIFT) {
      this.audit.log("learning-updated", {
        opportunityId,
        predictedScore: prediction.predictedScore,
        actualScore,
        drift: prediction.drift,
        significant: true,
      }, opportunityId, "prediction");
    }

    return prediction;
  }

  getFor(opportunityId: string): PredictionRecord | undefined {
    return this.predictions.get(opportunityId);
  }

  significantDrifts(threshold = SIGNIFICANT_DRIFT): PredictionRecord[] {
    return [...this.predictions.values()].filter(
      (p) => p.drift !== null && Math.abs(p.drift) >= threshold,
    );
  }

  avgDrift(): number {
    const resolved = [...this.predictions.values()].filter((p) => p.drift !== null);
    if (resolved.length === 0) return 0;
    return resolved.reduce((s, p) => s + (p.drift ?? 0), 0) / resolved.length;
  }

  avgAbsDrift(): number {
    const resolved = [...this.predictions.values()].filter((p) => p.drift !== null);
    if (resolved.length === 0) return 0;
    return resolved.reduce((s, p) => s + Math.abs(p.drift ?? 0), 0) / resolved.length;
  }

  all(): PredictionRecord[] {
    return [...this.predictions.values()];
  }

  size(): number {
    return this.predictions.size;
  }
}
