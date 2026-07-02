import type { RawResearchItem } from "../research/types.js";
import type { CompetitionResult, CompetitorMention } from "./types.js";

/**
 * Fixed regex patterns for competitor-name extraction. Deterministic,
 * substring/regex based — no LLM call, no invented competitor names.
 */
const COMPETITOR_PATTERNS: RegExp[] = [
  /switched from ([a-z0-9][a-z0-9\s.]{1,30})/g,
  /migrated from ([a-z0-9][a-z0-9\s.]{1,30})/g,
  /alternative to ([a-z0-9][a-z0-9\s.]{1,30})/g,
  /instead of ([a-z0-9][a-z0-9\s.]{1,30})/g,
  /replacement for ([a-z0-9][a-z0-9\s.]{1,30})/g,
];

function blobOf(item: RawResearchItem): string {
  return `${item.title} ${item.body ?? ""}`.toLowerCase();
}

function titleCase(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(" ");
}

function isPurelyNumeric(name: string): boolean {
  return !/[a-z]/i.test(name);
}

/**
 * Scans raw evidence items for competitor-name mentions using a fixed set of
 * "switched from X" style patterns. More distinct named competitors implies
 * a more crowded market, so competitionScore is inversely proportional to
 * the count of distinct competitors found.
 */
export function extractCompetitionEvidence(items: RawResearchItem[]): CompetitionResult {
  const tally = new Map<string, { display: string; mentionCount: number; urls: Set<string> }>();

  for (const item of items) {
    const blob = blobOf(item);
    for (const pattern of COMPETITOR_PATTERNS) {
      const regex = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(blob)) !== null) {
        const captured = (match[1] ?? "").trim();
        if (captured.length === 0) continue;
        const words = captured.split(/\s+/).filter((word) => word.length > 0).slice(0, 2);
        const extracted = words.join(" ").slice(0, 40).trim();
        if (extracted.length === 0) continue;
        if (isPurelyNumeric(extracted)) continue;

        const key = extracted.toLowerCase();
        const existing = tally.get(key);
        if (existing) {
          existing.mentionCount += 1;
          existing.urls.add(item.url);
        } else {
          tally.set(key, { display: titleCase(extracted), mentionCount: 1, urls: new Set([item.url]) });
        }
      }
    }
  }

  const competitors: CompetitorMention[] = [...tally.values()]
    .map((entry) => ({
      name: entry.display,
      mentionCount: entry.mentionCount,
      evidenceUrls: [...entry.urls],
    }))
    .sort((a, b) => b.mentionCount - a.mentionCount);

  if (competitors.length === 0) {
    return {
      competitors: [],
      competitionScore: 1,
      explanation:
        "No competitor mentions found in evidence — does not mean no competition exists, only that none was mentioned in collected discussions.",
    };
  }

  const competitionScore = 1 / (1 + competitors.length);

  return {
    competitors,
    competitionScore,
    explanation: `${competitors.length} distinct competitor(s) mentioned across evidence -> competition score ${competitionScore.toFixed(2)}.`,
  };
}
