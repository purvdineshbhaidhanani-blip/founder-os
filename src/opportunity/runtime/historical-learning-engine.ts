import { generateId, nowIso } from "../../utils/id.js";
import type { CourtVerdict } from "../decision/types.js";
import type { LearningRecord, LearningCalibration } from "./types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Historical Learning Engine — calibrates from prediction → outcome
// ---------------------------------------------------------------------------

export class HistoricalLearningEngine {
  private readonly records = new Map<string, LearningRecord>();
  private calibration: LearningCalibration = buildEmptyCalibration();

  constructor(private readonly audit: AuditLog) {}

  createRecord(
    opportunityId: string,
    predictionVerdict: CourtVerdict,
    predictionConfidence: number,
  ): LearningRecord {
    const record: LearningRecord = {
      id: generateId("learn"),
      opportunityId,
      predictionMade: nowIso(),
      predictionVerdict,
      predictionConfidence,
      founderDecision: null,
      founderDecidedAt: null,
      actualOutcome: null,
      actualOutcomeAt: null,
      accuracyScore: null,
    };
    this.records.set(opportunityId, record);
    return record;
  }

  recordFounderDecision(
    opportunityId: string,
    decision: "approved" | "rejected" | "deferred",
  ): void {
    const record = this.records.get(opportunityId);
    if (!record) return;
    record.founderDecision = decision;
    record.founderDecidedAt = nowIso();
  }

  recordOutcome(
    opportunityId: string,
    outcome: "success" | "failure" | "abandoned",
  ): void {
    const record = this.records.get(opportunityId);
    if (!record) return;
    record.actualOutcome = outcome;
    record.actualOutcomeAt = nowIso();

    // Score accuracy: BUILD_NOW + founder approved + success = 1.0
    record.accuracyScore = computeAccuracy(record);
    this.audit.log("learning-updated", {
      opportunityId,
      predictionVerdict: record.predictionVerdict,
      outcome,
      accuracyScore: record.accuracyScore,
    }, opportunityId, "learning");

    this.recalibrate();
  }

  getCalibration(): LearningCalibration {
    return { ...this.calibration };
  }

  getRecord(opportunityId: string): LearningRecord | undefined {
    return this.records.get(opportunityId);
  }

  allRecords(): LearningRecord[] {
    return [...this.records.values()];
  }

  resolvedRecords(): LearningRecord[] {
    return [...this.records.values()].filter((r) => r.accuracyScore !== null);
  }

  private recalibrate(): void {
    const resolved = this.resolvedRecords();
    if (resolved.length === 0) return;

    const accuracyRate = avg(resolved.map((r) => r.accuracyScore ?? 0));

    const byVerdict: Partial<Record<CourtVerdict, number[]>> = {};
    for (const r of resolved) {
      const arr = byVerdict[r.predictionVerdict] ?? [];
      arr.push(r.accuracyScore ?? 0);
      byVerdict[r.predictionVerdict] = arr;
    }

    const precisionByVerdict: Record<CourtVerdict, number> = {
      BUILD_NOW: 0,
      RESEARCH_MORE: 0,
      WAIT: 0,
      MONITOR: 0,
      REJECT: 0,
    };
    for (const [v, scores] of Object.entries(byVerdict) as [CourtVerdict, number[]][]) {
      precisionByVerdict[v] = avg(scores);
    }

    const calibrationError = resolved.reduce((err, r) => {
      const expected = r.accuracyScore ?? 0;
      return err + Math.abs(expected - r.predictionConfidence);
    }, 0) / resolved.length;

    this.calibration = {
      totalPredictions: this.records.size,
      resolvedPredictions: resolved.length,
      accuracyRate,
      precisionByVerdict,
      confidenceCalibrationError: calibrationError,
      lastUpdated: nowIso(),
    };
  }
}

function computeAccuracy(record: LearningRecord): number {
  if (!record.actualOutcome || !record.founderDecision) return 0;

  const verdictPositive = record.predictionVerdict === "BUILD_NOW" || record.predictionVerdict === "RESEARCH_MORE";
  const founderApproved = record.founderDecision === "approved";
  const succeeded = record.actualOutcome === "success";

  if (verdictPositive && founderApproved && succeeded) return 1.0;
  if (!verdictPositive && !founderApproved) return record.actualOutcome === "abandoned" ? 1.0 : 0.5;
  if (verdictPositive && !founderApproved) return 0.0;
  return 0.3;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function buildEmptyCalibration(): LearningCalibration {
  return {
    totalPredictions: 0,
    resolvedPredictions: 0,
    accuracyRate: 0,
    precisionByVerdict: { BUILD_NOW: 0, RESEARCH_MORE: 0, WAIT: 0, MONITOR: 0, REJECT: 0 },
    confidenceCalibrationError: 0,
    lastUpdated: nowIso(),
  };
}
