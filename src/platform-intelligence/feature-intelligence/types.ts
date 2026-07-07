export interface FeatureUsageEvent {
  featureId: string;
  subjectId: string;
  timestamp: string;
}

export const FEATURE_LIFECYCLE_STAGES = [
  "emerging",
  "growing",
  "stable",
  "declining",
  "retirement-candidate",
] as const;
export type FeatureLifecycleStage = (typeof FEATURE_LIFECYCLE_STAGES)[number];

export interface FeatureUsageSummary {
  featureId: string;
  totalEvents: number;
  uniqueSubjects: number;
  firstUsedAt?: string;
  lastUsedAt?: string;
}

export interface FeatureAdoptionSnapshot {
  featureId: string;
  adoptedSubjects: number;
  totalSubjects: number;
  adoptionRate: number;
}

export interface FeatureSuccessCriteria {
  targetAdoptionRate: number;
  targetRetentionRate?: number;
}

export interface FeatureSuccessScore {
  featureId: string;
  score: number;
  meetsCriteria: boolean;
}

export interface UsageBucket {
  bucketStart: string;
  count: number;
}
