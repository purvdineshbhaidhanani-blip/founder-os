import type { BlueprintContext, CompetitorAnalysis, Competitor } from "./types.js";
import type { ContentCategory } from "../types.js";

// ---------------------------------------------------------------------------
// Competitor Analyzer
// Returns likely competitor archetypes and competitive gaps per category.
// ---------------------------------------------------------------------------

interface CompetitorTemplate {
  competitors: Array<Omit<Competitor, "weakness">>;
  genericGaps: string[];
  switchingTrigger: string;
}

const CATEGORY_COMPETITORS: Partial<Record<ContentCategory, CompetitorTemplate>> = {
  "ai": {
    competitors: [
      { name: "OpenAI / Anthropic direct API", type: "indirect", strength: "Raw model power", estimatedPricing: "Usage-based" },
      { name: "LangChain / LlamaIndex ecosystem", type: "indirect", strength: "Open-source framework", estimatedPricing: "Free + infra" },
      { name: "Vertical AI SaaS incumbents", type: "direct", strength: "Domain-specific training data", estimatedPricing: "$50–500/mo" },
    ],
    genericGaps: ["No turnkey solution for specific vertical", "High integration effort", "No fine-tuned domain model available"],
    switchingTrigger: "Better accuracy in domain + lower hallucination rate",
  },
  "automation": {
    competitors: [
      { name: "Zapier", type: "direct", strength: "5000+ integrations, brand recognition", estimatedPricing: "$20–250/mo" },
      { name: "Make (Integromat)", type: "direct", strength: "Complex logic, visual builder", estimatedPricing: "$9–99/mo" },
      { name: "n8n", type: "indirect", strength: "Self-hosted, developer-friendly", estimatedPricing: "Free (self-host)" },
    ],
    genericGaps: ["Zapier too expensive at scale", "Non-technical users can't build complex flows", "No industry-specific templates"],
    switchingTrigger: "Cheaper at scale + better error handling",
  },
  "developer-tools": {
    competitors: [
      { name: "GitHub / GitLab built-in features", type: "indirect", strength: "Already in workflow", estimatedPricing: "Bundled" },
      { name: "Existing OSS alternatives", type: "indirect", strength: "Free, customizable", estimatedPricing: "Free" },
      { name: "IDE plugins", type: "direct", strength: "Low friction, in-editor", estimatedPricing: "Freemium" },
    ],
    genericGaps: ["No AI-native workflow", "Poor cross-repo insights", "Weak team collaboration"],
    switchingTrigger: "10x developer velocity improvement",
  },
  "saas": {
    competitors: [
      { name: "Spreadsheet + manual process", type: "diy", strength: "Zero cost, full control", estimatedPricing: "Free" },
      { name: "Vertical SaaS incumbents", type: "direct", strength: "Market awareness, integrations", estimatedPricing: "$50–500/mo" },
      { name: "Airtable / Notion custom builds", type: "indirect", strength: "Flexible, familiar UI", estimatedPricing: "$10–50/seat" },
    ],
    genericGaps: ["No automation layer", "Poor reporting", "No AI features"],
    switchingTrigger: "Automation saves >2h/week + better data visibility",
  },
  "productivity": {
    competitors: [
      { name: "Notion / Confluence", type: "indirect", strength: "Broad adoption, all-in-one", estimatedPricing: "$8–25/seat" },
      { name: "Monday.com / Asana", type: "direct", strength: "Project tracking, brand", estimatedPricing: "$10–30/seat" },
      { name: "Custom spreadsheets", type: "diy", strength: "Free, familiar", estimatedPricing: "Free" },
    ],
    genericGaps: ["Too generic — no workflow-specific automation", "No AI summarization", "Data siloed across tools"],
    switchingTrigger: "AI automates repetitive tasks + reduces meeting overhead",
  },
  "finance": {
    competitors: [
      { name: "QuickBooks / Xero", type: "direct", strength: "Market share, accountant trust", estimatedPricing: "$30–150/mo" },
      { name: "Spreadsheet finance models", type: "diy", strength: "Free, fully custom", estimatedPricing: "Free" },
      { name: "Enterprise ERP (SAP, Oracle)", type: "indirect", strength: "All-in-one for enterprise", estimatedPricing: "$1000+/mo" },
    ],
    genericGaps: ["No real-time cash flow AI", "Poor multi-entity consolidation", "Slow month-end close"],
    switchingTrigger: "Real-time visibility + AI anomaly detection",
  },
  "sales": {
    competitors: [
      { name: "Salesforce", type: "direct", strength: "Ecosystem, brand, integrations", estimatedPricing: "$75–300/seat" },
      { name: "HubSpot CRM", type: "direct", strength: "Freemium, inbound-focused", estimatedPricing: "Free–$120/seat" },
      { name: "Manual tracking + email", type: "diy", strength: "Zero cost", estimatedPricing: "Free" },
    ],
    genericGaps: ["CRM too heavy for SMB", "No AI deal scoring", "Poor activity tracking"],
    switchingTrigger: "AI-driven pipeline insights + less CRM data entry",
  },
  "marketing": {
    competitors: [
      { name: "HubSpot Marketing Hub", type: "direct", strength: "All-in-one, brand", estimatedPricing: "$45–800/mo" },
      { name: "Mailchimp / Klaviyo", type: "direct", strength: "Email-focused, simple", estimatedPricing: "$20–300/mo" },
      { name: "Manual campaigns + agencies", type: "diy", strength: "Custom strategy", estimatedPricing: "Variable" },
    ],
    genericGaps: ["No cross-channel attribution", "Expensive at SMB scale", "AI content still needs heavy editing"],
    switchingTrigger: "Better ROI attribution + AI content that needs <30% editing",
  },
};

const FALLBACK_TEMPLATE: CompetitorTemplate = {
  competitors: [
    { name: "Manual / spreadsheet process", type: "diy", strength: "Free, no vendor lock-in", estimatedPricing: "Free" },
    { name: "Horizontal SaaS (Airtable/Notion)", type: "indirect", strength: "Flexible, widely adopted", estimatedPricing: "$10–30/seat" },
    { name: "Incumbent vertical software", type: "direct", strength: "Existing customer relationships", estimatedPricing: "$50–500/mo" },
  ],
  genericGaps: ["No workflow-specific automation", "Poor AI integration", "Expensive or inflexible pricing"],
  switchingTrigger: "Saves meaningful time with measurable ROI",
};

export function analyzeCompetitors(ctx: BlueprintContext): CompetitorAnalysis {
  const { intelligence: intel } = ctx;
  const template = CATEGORY_COMPETITORS[intel.category] ?? FALLBACK_TEMPLATE;

  // Supplement gaps with detected solution failure signals
  const detectedGaps = intel.existingSolutionScore.solutionFailureSignals.slice(0, 3);
  const allGaps = [...new Set([...detectedGaps, ...template.genericGaps])].slice(0, 6);

  // Derive our advantage from the top intelligence signals
  const ourAdvantage = buildAdvantage(intel.category, intel.aiReadinessScore.score, intel.humanTimeSavedScore.estimatedHoursPerWeekPerUser);

  const competitors: Competitor[] = template.competitors.map((c) => ({
    ...c,
    weakness: deriveWeakness(c.type, c.name),
  }));

  return {
    competitors,
    competitiveGaps: allGaps,
    ourAdvantage,
    switchingTrigger: template.switchingTrigger,
  };
}

function buildAdvantage(category: ContentCategory, aiScore: number, hoursSaved: number): string {
  const parts: string[] = [];
  if (aiScore >= 0.75) parts.push("AI-native from day one — incumbents are retrofitting");
  if (hoursSaved >= 3) parts.push(`${hoursSaved}h/week saved per user — 10x better than manual`);
  if (category === "developer-tools" || category === "apis") parts.push("Developer-first workflow — no sales-led adoption required");
  if (parts.length === 0) parts.push("Purpose-built for this specific workflow — not a generic tool");
  return parts.join("; ");
}

function deriveWeakness(type: Competitor["type"], name: string): string {
  if (type === "diy") return "No automation, high human error rate, doesn't scale";
  if (name.toLowerCase().includes("spreadsheet") || name.toLowerCase().includes("excel")) return "No real-time data, no collaboration, breaks at scale";
  if (name.toLowerCase().includes("salesforce") || name.toLowerCase().includes("sap") || name.toLowerCase().includes("oracle")) return "Too complex, high implementation cost, slow iteration";
  return "Not built specifically for this workflow — users force-fit a generic tool";
}
