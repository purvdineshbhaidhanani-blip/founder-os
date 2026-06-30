import type { BlueprintContext, AIPlan, AIComponent } from "./types.js";

// ---------------------------------------------------------------------------
// AI Planner
// Designs AI components based on ai-readiness score and category signals.
// ---------------------------------------------------------------------------

export function planAI(ctx: BlueprintContext): AIPlan {
  const { intelligence: intel } = ctx;
  const aiScore = intel.aiReadinessScore.score;
  const category = intel.category;

  const components: AIComponent[] = [];

  // Core automation component (always if AI-ready)
  if (aiScore >= 0.5) {
    components.push({
      name: "Core Automation AI",
      purpose: "Automate the primary manual workflow identified in evidence",
      model: "claude-sonnet-4-6",
      estimatedTokensPerDay: 500_000,
    });
  }

  // Document / text processing
  if (aiScore >= 0.65 && ["automation", "saas", "operations", "legal-tech", "finance", "hr"].includes(category)) {
    components.push({
      name: "Document Processor",
      purpose: "Extract structured data from unstructured documents (PDFs, emails, invoices)",
      model: "claude-sonnet-4-6",
      estimatedTokensPerDay: 1_000_000,
    });
  }

  // Natural language query interface
  if (aiScore >= 0.6) {
    components.push({
      name: "NL Query Interface",
      purpose: "Answer plain-English questions about data — no SQL needed",
      model: "claude-haiku-4-5-20251001",
      estimatedTokensPerDay: 200_000,
    });
  }

  // Anomaly / insight detection
  if (["finance", "cybersecurity", "devops", "operations", "saas"].includes(category)) {
    components.push({
      name: "Anomaly Detector",
      purpose: "Proactively surface outliers and trends before users notice",
      model: "claude-haiku-4-5-20251001",
      estimatedTokensPerDay: 100_000,
    });
  }

  // Embedding-based search
  if (aiScore >= 0.55) {
    components.push({
      name: "Semantic Search",
      purpose: "Vector search over user content — find similar items, related history",
      model: "text-embedding-3-small",
      estimatedTokensPerDay: 300_000,
    });
  }

  // Fallback if no components added
  if (components.length === 0) {
    components.push({
      name: "Basic AI Assistant",
      purpose: "Simple Q&A and content generation helper",
      model: "claude-haiku-4-5-20251001",
      estimatedTokensPerDay: 50_000,
    });
  }

  return {
    components,
    primaryModel: "claude-sonnet-4-6",
    fallbackModel: "claude-haiku-4-5-20251001",
    dataStrategy: "User data processed in-context only — no model fine-tuning on customer data in MVP. RAG retrieval for large corpora.",
    privacyApproach: "No PII sent to third-party models without explicit user consent. Data stays in customer's tenancy.",
  };
}
