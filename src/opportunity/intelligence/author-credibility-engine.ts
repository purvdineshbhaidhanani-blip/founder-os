import type { AuthorCredibilityScore, ScoringContext } from "./types.js";

// ---------------------------------------------------------------------------
// Author Credibility Engine
// Uses engagement signals as proxies for author credibility.
// High votes/upvotes from peers = author is credible in their community.
// ---------------------------------------------------------------------------

// Engagement thresholds per tier
const HIGH_CREDIBILITY_VOTE_THRESHOLD = 50;
const MEDIUM_CREDIBILITY_VOTE_THRESHOLD = 10;

// Review sites = authors are verified customers → automatically higher credibility
const HIGH_TRUST_SOURCES = new Set(["g2", "capterra", "trustpilot"]);
const DEVELOPER_SOURCES = new Set(["github-issues", "github-discussions", "stackoverflow"]);

export function scoreAuthorCredibility(ctx: ScoringContext): AuthorCredibilityScore {
  const { opportunity } = ctx;
  const evidenceItems = opportunity.evidence;

  if (evidenceItems.length === 0) {
    return { score: 0.2, highCredibilityCount: 0 };
  }

  let totalScore = 0;
  let highCredibilityCount = 0;

  for (const ev of evidenceItems) {
    const votes = ev.engagement.votes ?? 0;
    const replies = ev.engagement.replies ?? 0;
    const stars = ev.engagement.stars ?? 0;

    let itemScore: number;

    if (HIGH_TRUST_SOURCES.has(ev.source)) {
      // Verified review — credibility starts high, boosted by votes
      itemScore = 0.75 + Math.min(0.2, votes * 0.01);
    } else if (DEVELOPER_SOURCES.has(ev.source)) {
      // Developer communities — engagement-weighted
      const engagement = votes + replies * 2 + stars;
      itemScore = engagement >= HIGH_CREDIBILITY_VOTE_THRESHOLD ? 0.85
        : engagement >= MEDIUM_CREDIBILITY_VOTE_THRESHOLD ? 0.65
        : 0.45;
    } else {
      // General sources — vote count as main proxy
      const engagement = votes + replies;
      itemScore = engagement >= HIGH_CREDIBILITY_VOTE_THRESHOLD ? 0.70
        : engagement >= MEDIUM_CREDIBILITY_VOTE_THRESHOLD ? 0.50
        : 0.30;
    }

    if (itemScore >= 0.7) highCredibilityCount++;
    totalScore += itemScore;
  }

  const score = Math.min(1, totalScore / evidenceItems.length);
  return { score, highCredibilityCount };
}
