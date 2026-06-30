import { generateId, nowIso } from "../../utils/id.js";
import type { CollectedItem, CollectorSource, ContentCategory } from "../types.js";
import type { CollectorError } from "../collector.js";

/**
 * Shared helpers for all collector adapters.
 * Adapters call these to produce normalised CollectedItem objects.
 */

export function makeItem(
  source: CollectorSource,
  partial: Omit<CollectedItem, "id" | "collectedAt">,
): CollectedItem {
  return {
    id: generateId("item"),
    collectedAt: nowIso(),
    ...partial,
  };
}

export function makeError(code: string, message: string, context?: Record<string, unknown>): CollectorError {
  return { code, message, context };
}

export function nowIsoString(): string {
  return nowIso();
}

/** Maps free-text category hints to ContentCategory. Falls back to "other". */
export function classifyCategory(text: string): ContentCategory {
  const t = text.toLowerCase();
  const MAP: [string[], ContentCategory][] = [
    [["ai", "machine learning", "llm", "gpt", "openai", "anthropic"], "ai"],
    [["devops", "kubernetes", "docker", "ci/cd", "pipeline", "deploy"], "devops"],
    [["cloud", "aws", "gcp", "azure", "serverless"], "cloud"],
    [["api", "rest", "graphql", "webhook", "sdk"], "apis"],
    [["developer", "coding", "programming", "debug", "ide", "git"], "developer-tools"],
    [["no-code", "nocode", "no code"], "no-code"],
    [["low-code", "lowcode", "low code"], "low-code"],
    [["saas", "software as a service", "subscription"], "saas"],
    [["automation", "automate", "automated"], "automation"],
    [["productivity", "workflow", "task management"], "productivity"],
    [["sales", "crm", "lead", "prospect", "revenue"], "sales"],
    [["marketing", "seo", "campaign", "analytics", "advertising"], "marketing"],
    [["finance", "accounting", "invoicing", "payment", "billing"], "finance"],
    [["hr", "human resources", "hiring", "payroll", "onboarding"], "hr"],
    [["legal", "compliance", "contract", "gdpr"], "legal-tech"],
    [["healthcare", "medical", "ehr", "hipaa", "clinic"], "healthcare-tech"],
    [["construction", "building", "contractor", "architecture"], "construction-tech"],
    [["manufacturing", "factory", "supply chain", "inventory", "erp"], "manufacturing"],
    [["security", "cybersecurity", "vulnerability", "pen test", "siem"], "cybersecurity"],
    [["creator", "content creator", "youtube", "newsletter", "podcast"], "creator-economy"],
    [["enterprise", "b2b", "organization", "corporate"], "enterprise"],
    [["business", "startup", "company", "operations"], "business"],
    [["professional services", "consulting", "agency", "freelance"], "professional-services"],
  ];
  for (const [keywords, cat] of MAP) {
    if (keywords.some((k) => t.includes(k))) return cat;
  }
  return "software";
}

/** Detect language from text (simple heuristic — production would use a lib). */
export function detectLanguage(text: string): string {
  const sample = text.slice(0, 200).toLowerCase();
  if (/[一-鿿]/.test(sample)) return "zh";
  if (/[぀-ゟ゠-ヿ]/.test(sample)) return "ja";
  if (/[Ѐ-ӿ]/.test(sample)) return "ru";
  if (/\b(der|die|das|und|ist|ich|nicht|auch)\b/.test(sample)) return "de";
  if (/\b(et|le|la|les|du|dans|est|pour|avec)\b/.test(sample)) return "fr";
  if (/\b(el|la|los|las|es|para|por|con|una)\b/.test(sample)) return "es";
  if (/\b(e|de|do|da|em|não|que|uma|para)\b/.test(sample)) return "pt";
  return "en";
}
