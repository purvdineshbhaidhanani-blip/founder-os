import type { NoiseScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Noise Intelligence Engine
// Detects entertainment, memes, viral content, political/celebrity noise.
// Score: 1 = pure signal, 0 = pure noise.
// ---------------------------------------------------------------------------

const NOISE_PATTERNS: Array<{ reason: string; re: RegExp }> = [
  { reason: "entertainment-content", re: /\b(movie|film|tv show|netflix series|celebrity|kardashian|taylor swift|celebrity|oscar|grammy|emmy|sports team|nfl|nba|premier league)\b/i },
  { reason: "meme-or-viral", re: /\b(meme|viral|going viral|trending|twitter drama|ratio'd|based|cringe|cope|seethe|npc|sigma|chad|based)\b/i },
  { reason: "political-content", re: /\b(democrat|republican|trump|biden|liberal|conservative|left wing|right wing|election|vote for|political party|woke|based politics)\b/i },
  { reason: "celebrity-gossip", re: /\b(celebrity gossip|red carpet|paparazzi|tabloid|influencer drama|youtube drama|cancel culture battle)\b/i },
  { reason: "gaming-non-professional", re: /\b(fortnite|minecraft|roblox|call of duty|gta v|among us|fall guys|game cheat|speedrun)\b/i },
  { reason: "lifestyle-content", re: /\b(diet tips|workout routine|skincare|fashion trend|beauty hack|relationship advice|zodiac|horoscope)\b/i },
];

// Signals that strongly indicate genuine business noise (NOT about software problems)
const ANTI_BUSINESS_RE = /\b(celebrity|actor|actress|musician|athlete|reality show|soap opera|game show)\b/i;

// Strong signal indicators that override noise
const STRONG_SIGNAL_TYPES = new Set(["missing-feature", "integration-pain", "time-loss", "money-loss", "api-gap", "automation-request", "workaround"]);

export function scoreNoise(ctx: ScoringContext): NoiseScore {
  const { opportunity, allText } = ctx;
  const reasons: string[] = [];

  // Check for noise patterns
  let noiseHits = 0;
  for (const { reason, re } of NOISE_PATTERNS) {
    if (re.test(allText)) {
      noiseHits++;
      reasons.push(reason);
    }
  }

  // Anti-business content is a hard noise signal
  if (ANTI_BUSINESS_RE.test(allText)) {
    noiseHits += 2;
    reasons.push("anti-business-content");
  }

  // Strong signal types lower noise
  const strongSignalFraction = opportunity.evidence.filter((e) =>
    STRONG_SIGNAL_TYPES.has(e.signalType),
  ).length / Math.max(1, opportunity.evidence.length);

  // Multi-source = less likely noise
  const sourceBonus = Math.min(0.3, opportunity.sources.length * 0.06);

  // Engagement on evidence reduces noise
  const avgEngagement =
    opportunity.evidence.reduce((sum, e) => sum + (e.engagement.votes ?? 0) + (e.engagement.replies ?? 0), 0) /
    Math.max(1, opportunity.evidence.length);
  const engagementBonus = Math.min(0.2, avgEngagement / 50);

  // Base score: start at 1.0, subtract for noise hits, add for strong signals
  let score = 1.0 - noiseHits * 0.25 + strongSignalFraction * 0.2 + sourceBonus + engagementBonus;
  score = Math.max(0, Math.min(1, score));

  const isNoise = score < 0.3 || noiseHits >= 3;

  return { score, isNoise, reasons };
}
