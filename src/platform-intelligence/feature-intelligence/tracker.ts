import { combineConfidence } from "../shared/confidence.js";
import type {
  FeatureAdoptionSnapshot,
  FeatureLifecycleStage,
  FeatureSuccessCriteria,
  FeatureSuccessScore,
  FeatureUsageEvent,
  FeatureUsageSummary,
  UsageBucket,
} from "./types.js";

function dayBucketStart(timestamp: string): string {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

export interface RetirementCandidateOptions {
  /** Feature usage must decline at least this percentage (bucket-over-bucket) to be considered. Defaults to 30. */
  declineThresholdPct?: number;
  /** Feature adoption rate must be below this to be considered. Defaults to 0.1. */
  maxAdoptionRate?: number;
}

/**
 * Tracks raw feature usage events and derives adoption, usage, success, and
 * lifecycle/retirement signal from them. Nothing here knows what a
 * "feature" represents in any specific product — `featureId` is an opaque
 * string supplied by the caller.
 */
export class FeatureIntelligenceTracker {
  private readonly events: FeatureUsageEvent[] = [];

  recordUsage(featureId: string, subjectId: string, timestamp: string = new Date().toISOString()): void {
    this.events.push({ featureId, subjectId, timestamp });
  }

  private eventsFor(featureId: string): FeatureUsageEvent[] {
    return this.events.filter((e) => e.featureId === featureId);
  }

  usageSummary(featureId: string): FeatureUsageSummary {
    const events = this.eventsFor(featureId);
    const timestamps = events.map((e) => e.timestamp).sort();
    return {
      featureId,
      totalEvents: events.length,
      uniqueSubjects: new Set(events.map((e) => e.subjectId)).size,
      firstUsedAt: timestamps[0],
      lastUsedAt: timestamps[timestamps.length - 1],
    };
  }

  adoption(featureId: string, totalSubjects: number): FeatureAdoptionSnapshot {
    const adoptedSubjects = new Set(this.eventsFor(featureId).map((e) => e.subjectId)).size;
    return {
      featureId,
      adoptedSubjects,
      totalSubjects,
      adoptionRate: totalSubjects > 0 ? adoptedSubjects / totalSubjects : 0,
    };
  }

  /** Buckets usage events per UTC day, oldest first. */
  usageTrend(featureId: string): UsageBucket[] {
    const buckets = new Map<string, number>();
    for (const event of this.eventsFor(featureId)) {
      const bucket = dayBucketStart(event.timestamp);
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucketStart, count]) => ({ bucketStart, count }));
  }

  /** Bucket-over-bucket percent change of the most recent two usage buckets. Positive = growing, negative = declining. */
  private trendPct(featureId: string): number {
    const trend = this.usageTrend(featureId);
    if (trend.length < 2) return 0;
    const latest = trend[trend.length - 1]!.count;
    const previous = trend[trend.length - 2]!.count;
    if (previous === 0) return latest === 0 ? 0 : 100;
    return ((latest - previous) / previous) * 100;
  }

  successScore(featureId: string, totalSubjects: number, criteria: FeatureSuccessCriteria, retentionRate?: number): FeatureSuccessScore {
    const adoption = this.adoption(featureId, totalSubjects);
    const adoptionSignal = criteria.targetAdoptionRate > 0 ? adoption.adoptionRate / criteria.targetAdoptionRate : 1;

    const signals = [{ weight: 0.7, strength: adoptionSignal }];
    if (criteria.targetRetentionRate !== undefined && retentionRate !== undefined) {
      signals.push({ weight: 0.3, strength: retentionRate / criteria.targetRetentionRate });
    }

    const score = combineConfidence(signals);
    const meetsCriteria =
      adoption.adoptionRate >= criteria.targetAdoptionRate &&
      (criteria.targetRetentionRate === undefined || (retentionRate ?? 0) >= criteria.targetRetentionRate);

    return { featureId, score, meetsCriteria };
  }

  lifecycleStage(featureId: string, totalSubjects: number): FeatureLifecycleStage {
    const adoption = this.adoption(featureId, totalSubjects);
    const trendPct = this.trendPct(featureId);

    if (adoption.adoptionRate < 0.05) return "emerging";
    if (trendPct <= -50 && adoption.adoptionRate < 0.15) return "retirement-candidate";
    if (trendPct <= -20) return "declining";
    if (trendPct >= 20) return "growing";
    return "stable";
  }

  /** Feature ids whose usage has declined sharply and whose adoption is low — candidates for retirement. */
  retirementCandidates(totalSubjectsByFeature: Record<string, number>, options: RetirementCandidateOptions = {}): string[] {
    const declineThresholdPct = options.declineThresholdPct ?? 30;
    const maxAdoptionRate = options.maxAdoptionRate ?? 0.1;

    return Object.entries(totalSubjectsByFeature)
      .filter(([featureId, totalSubjects]) => {
        const adoption = this.adoption(featureId, totalSubjects);
        const trendPct = this.trendPct(featureId);
        return adoption.adoptionRate <= maxAdoptionRate && trendPct <= -declineThresholdPct;
      })
      .map(([featureId]) => featureId);
  }
}
