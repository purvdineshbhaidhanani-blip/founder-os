import type { Timestamp } from "../types/common.js";

// ---------------------------------------------------------------------------
// Source identity
// ---------------------------------------------------------------------------

export type CollectorSource =
  | "reddit"
  | "github-issues"
  | "github-discussions"
  | "stackoverflow"
  | "product-hunt"
  | "hacker-news"
  | "g2"
  | "capterra"
  | "trustpilot"
  | "google-play"
  | "apple-store"
  | "youtube"
  | "professional-blogs"
  | "professional-forums";

export type ContentCategory =
  | "ai"
  | "software"
  | "automation"
  | "developer-tools"
  | "saas"
  | "productivity"
  | "business"
  | "enterprise"
  | "operations"
  | "sales"
  | "marketing"
  | "finance"
  | "hr"
  | "legal-tech"
  | "healthcare-tech"
  | "construction-tech"
  | "manufacturing"
  | "cybersecurity"
  | "cloud"
  | "devops"
  | "apis"
  | "no-code"
  | "low-code"
  | "creator-economy"
  | "professional-services"
  | "other";

// ---------------------------------------------------------------------------
// Raw collected item — normalised across all sources
// ---------------------------------------------------------------------------

export interface CollectedItem {
  id: string;
  source: CollectorSource;
  url: string;
  author: string;
  timestamp: Timestamp;
  language: string;
  category: ContentCategory;
  rawContent: string;
  context: string;
  engagement: CollectedItemEngagement;
  metadata: Record<string, unknown>;
  collectedAt: Timestamp;
}

export interface CollectedItemEngagement {
  replies?: number;
  votes?: number;
  stars?: number;
  reviews?: number;
  version?: string;
}

// ---------------------------------------------------------------------------
// Signal — structured extraction from a CollectedItem
// ---------------------------------------------------------------------------

export type SignalType =
  | "problem"
  | "complaint"
  | "request"
  | "missing-feature"
  | "bug"
  | "workflow"
  | "manual-process"
  | "workaround"
  | "integration-pain"
  | "time-loss"
  | "money-loss"
  | "api-gap"
  | "automation-request"
  | "repeated-task";

export type WorkaroundKind =
  | "excel"
  | "google-sheets"
  | "zapier"
  | "manual-copy-paste"
  | "multiple-apps"
  | "repeated-exports"
  | "custom-scripts"
  | "temporary-hacks"
  | "human-processes";

export interface Signal {
  id: string;
  itemId: string;
  source: CollectorSource;
  type: SignalType;
  summary: string;
  rawQuote: string;
  workarounds: WorkaroundKind[];
  buyingIntent: boolean;
  buyingIntentEvidence?: string;
  category: ContentCategory;
  extractedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Pain score — calculated per signal cluster
// ---------------------------------------------------------------------------

export interface PainScore {
  frequency: number;        // 0–1 normalised count of similar signals
  severity: number;         // 0–1 derived from language + signal type
  businessImpact: number;   // 0–1 derived from money-loss / time-loss signals
  timeLost: number;         // estimated hours/week, 0 if unknown
  moneyLost: number;        // estimated USD/month, 0 if unknown
  urgency: number;          // 0–1 inferred from language
  frustration: number;      // 0–1 inferred from sentiment
  operationalComplexity: number; // 0–1 workaround count proxy
  confidence: number;       // 0–1 overall
}

// ---------------------------------------------------------------------------
// Opportunity — one discovered business problem
// ---------------------------------------------------------------------------

export type OpportunityStatus = "discovered" | "verified" | "rejected";

export interface OpportunityEvidence {
  signalId: string;
  itemId: string;
  source: CollectorSource;
  url: string;
  quote: string;
  signalType: SignalType;
  engagement: CollectedItemEngagement;
}

export interface Opportunity {
  id: string;
  status: OpportunityStatus;
  problemSummary: string;
  category: ContentCategory;
  evidence: OpportunityEvidence[];
  painScore: PainScore;
  buyingIntentSignals: number;
  workaroundsDetected: WorkaroundKind[];
  sources: CollectorSource[];
  confidence: number;          // 0–1 aggregate
  signalCount: number;
  clusterKey: string;          // normalised problem fingerprint for dedup
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
