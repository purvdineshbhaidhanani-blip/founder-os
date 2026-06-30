import type { CollectedItem, PainScore, Signal } from "./types.js";

// ---------------------------------------------------------------------------
// Pain detector — derives PainScore from a cluster of signals + their items.
// Pure functions; no I/O.
// ---------------------------------------------------------------------------

const HIGH_SEVERITY_TYPES = new Set(["money-loss", "time-loss", "bug", "integration-pain", "api-gap"]);
const MEDIUM_SEVERITY_TYPES = new Set(["complaint", "missing-feature", "workaround", "manual-process"]);

const URGENCY_PATTERNS = [
  /\b(urgent|asap|immediately|right now|critical|blocking|blocker|can't (ship|launch|go live))\b/i,
  /\b(MUST|NEED|REQUIRED|essential|vital|deadline)\b/,
];

const FRUSTRATION_PATTERNS = [
  /\b(SO (frustrated|annoying|bad)|can't (believe|stand)|HATE|absolutely (terrible|broken|awful))\b/i,
  /[!]{2,}|[?]{3,}/,
  /\b(ridiculous|unacceptable|pathetic|garbage|trash|useless)\b/i,
];

const MONEY_LOSS_RE = [
  /\$[\d,]+(?:k|M)?(?:\s*\/\s*(month|year|day))?/i,
  /\b(\d+(?:k|K)?)\s*(dollars?|USD|euros?|GBP)\b/i,
  /\b(thousands?|hundreds?|millions?)\s+(?:in\s+)?(?:dollars?|revenue|savings?)\b/i,
];

const TIME_LOSS_RE = [
  /\b(\d+)\s*(hours?|days?|weeks?)\s+(?:per\s+)?(?:day|week|month|sprint|release)/i,
  /\b(hours?|days?)\s+(?:of|wasted|spent)\b/i,
];

/**
 * Calculate PainScore from a cluster of co-related signals and their source items.
 * `totalSignalCount` is the count in the entire cluster (for frequency normalisation).
 */
export function calculatePainScore(
  signals: Signal[],
  items: CollectedItem[],
  totalSignalCount: number,
): PainScore {
  const itemMap = new Map<string, CollectedItem>(items.map((i) => [i.id, i]));
  const allText = signals.map((s) => s.rawQuote + " " + s.summary).join("\n");

  const frequency = Math.min(1, totalSignalCount / 50); // 50+ occurrences = max frequency

  // Severity: derived from signal types present
  const highCount = signals.filter((s) => HIGH_SEVERITY_TYPES.has(s.type)).length;
  const midCount = signals.filter((s) => MEDIUM_SEVERITY_TYPES.has(s.type)).length;
  const severity = Math.min(1, (highCount * 0.3 + midCount * 0.15) / Math.max(1, signals.length * 0.3));

  // Business impact: money + time loss signals weighted by engagement
  const businessImpact = calcBusinessImpact(signals, itemMap);

  // Time and money estimates (best-effort extraction)
  const timeLost = extractTimeLost(allText);
  const moneyLost = extractMoneyLost(allText);

  // Urgency
  const urgency = Math.min(1, URGENCY_PATTERNS.filter((p) => p.test(allText)).length * 0.4);

  // Frustration
  const frustration = Math.min(1, FRUSTRATION_PATTERNS.filter((p) => p.test(allText)).length * 0.35);

  // Operational complexity: workaround variety
  const allWorkarounds = signals.flatMap((s) => s.workarounds);
  const uniqueWorkarounds = new Set(allWorkarounds).size;
  const operationalComplexity = Math.min(1, uniqueWorkarounds * 0.2);

  // Confidence: higher when more signals, more sources, more buying intent
  const buyingIntentCount = signals.filter((s) => s.buyingIntent).length;
  const uniqueSources = new Set(signals.map((s) => s.source)).size;
  const confidence = Math.min(
    1,
    (Math.log(totalSignalCount + 1) / Math.log(50)) * 0.4 +
    (uniqueSources / 14) * 0.3 +
    (buyingIntentCount > 0 ? 0.2 : 0) +
    (uniqueWorkarounds > 0 ? 0.1 : 0),
  );

  return {
    frequency,
    severity,
    businessImpact,
    timeLost,
    moneyLost,
    urgency,
    frustration,
    operationalComplexity,
    confidence,
  };
}

function calcBusinessImpact(signals: Signal[], itemMap: Map<string, CollectedItem>): number {
  let weightedScore = 0;
  let totalWeight = 0;
  for (const sig of signals) {
    const item = itemMap.get(sig.itemId);
    const engagement = item?.engagement ?? {};
    const weight = 1 + (engagement.votes ?? 0) * 0.01 + (engagement.replies ?? 0) * 0.02;
    const hasMoneySignal = sig.type === "money-loss" ? 1 : 0;
    const hasTimeSignal = sig.type === "time-loss" ? 0.7 : 0;
    const hasWorkaround = sig.workarounds.length > 0 ? 0.4 : 0;
    weightedScore += (hasMoneySignal + hasTimeSignal + hasWorkaround) * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? Math.min(1, weightedScore / totalWeight) : 0;
}

function extractTimeLost(text: string): number {
  for (const re of TIME_LOSS_RE) {
    const match = re.exec(text);
    if (match?.[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n)) return Math.min(n, 40); // cap at 40 hours/week
    }
  }
  return 0;
}

function extractMoneyLost(text: string): number {
  for (const re of MONEY_LOSS_RE) {
    const match = re.exec(text);
    if (match) {
      const raw = match[0].replace(/[$,]/g, "");
      const num = parseFloat(raw);
      if (!isNaN(num)) {
        const k = raw.toLowerCase().includes("k") ? 1000 : 1;
        const m = raw.toLowerCase().includes("m") ? 1_000_000 : 1;
        return Math.min(num * k * m, 10_000_000);
      }
    }
  }
  return 0;
}
