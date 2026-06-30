import { generateId, nowIso } from "../utils/id.js";
import type { CollectedItem, ContentCategory, Signal, SignalType, WorkaroundKind } from "./types.js";

// ---------------------------------------------------------------------------
// Signal extraction — converts a CollectedItem into structured Signal(s).
// Pure functions; no I/O.
// ---------------------------------------------------------------------------

const SIGNAL_PATTERNS: Array<{ type: SignalType; patterns: RegExp[] }> = [
  {
    type: "complaint",
    patterns: [
      /\b(hate|frustrat|annoying|terrible|awful|broken|sucks?|useless|ridiculous|nightmare)\b/i,
      /\b(can't believe|why (would|does|is)|how (is this|can this))\b/i,
    ],
  },
  {
    type: "missing-feature",
    patterns: [
      /\b(missing|lack|doesn't (have|support)|no (support|way|option)|wish (it|there|they)|would (be|love) (if|to)|feature request)\b/i,
      /\bwhy (isn't|can't|don't|doesn't)\b/i,
    ],
  },
  {
    type: "request",
    patterns: [
      /\b(please add|can (you|we) add|would (love|like|be great)|feature request|looking for|is there (a|an|any))\b/i,
      /\bneed(s)? (a|an|to|the ability)\b/i,
    ],
  },
  {
    type: "workaround",
    patterns: [
      /\b(workaround|work around|had to use|using .* instead|switched to|manually|export.*import|copy.paste|spreadsheet)\b/i,
      /\b(built my own|wrote (a )?script|custom script|automation|zapier|make\.com)\b/i,
    ],
  },
  {
    type: "integration-pain",
    patterns: [
      /\b(integrate|integration|connect(ion)?|sync(ing)?|api (doesn't|won't|can't)|webhook|no api)\b/i,
      /\b(doesn't (work|connect) with|can't (import|export|sync))\b/i,
    ],
  },
  {
    type: "time-loss",
    patterns: [
      /\b(hours?|days?|weeks?) (wasted|spent|lost|wasting|spending)\b/i,
      /\b(slow|takes? (forever|too long|ages?)|time.consuming|inefficient)\b/i,
    ],
  },
  {
    type: "money-loss",
    patterns: [
      /\b(expensive|overpriced|too costly|paying (too much|a lot)|pricing (is|sucks|terrible)|cost (us|me))\b/i,
      /\b(would pay|gladly pay|pay .* for|not worth (the )?price|value for money)\b/i,
    ],
  },
  {
    type: "api-gap",
    patterns: [
      /\b(no (public )?api|api (is|was|isn't) (missing|broken|undocumented|limited)|rate limit|api key)\b/i,
      /\b(endpoint (doesn't|won't) (exist|work)|undocumented|unofficial api)\b/i,
    ],
  },
  {
    type: "automation-request",
    patterns: [
      /\b(automate|automation|auto.?(run|trigger|schedule)|recurring|batch process|pipeline)\b/i,
      /\b(wish (this|it) (was|were|could be) automated)\b/i,
    ],
  },
  {
    type: "manual-process",
    patterns: [
      /\b(manually|by hand|one.by.one|every (day|week|month)|repeated|repetitive|tedious)\b/i,
      /\b(have to (do|check|update|send) (it|them) manually)\b/i,
    ],
  },
  {
    type: "bug",
    patterns: [
      /\b(bug|glitch|error|crash(es|ing|ed)?|broken|doesn't work|stopped working|regression)\b/i,
    ],
  },
  {
    type: "workflow",
    patterns: [
      /\b(workflow|process|pipeline|steps?|flow|procedure|our (current|existing) (way|process))\b/i,
    ],
  },
  {
    type: "repeated-task",
    patterns: [
      /\b(every (day|morning|week|time|monday)|daily|weekly|always (have to|need to)|routine)\b/i,
    ],
  },
  {
    type: "problem",
    patterns: [
      /\b(problem|issue|challenge|difficulty|struggle|pain|blocker|bottleneck|obstacle)\b/i,
    ],
  },
];

const WORKAROUND_PATTERNS: Array<{ kind: WorkaroundKind; patterns: RegExp[] }> = [
  { kind: "excel", patterns: [/\b(excel|xlsx?|spreadsheet)\b/i] },
  { kind: "google-sheets", patterns: [/\b(google sheets?|gsheets?)\b/i] },
  { kind: "zapier", patterns: [/\b(zapier|zap)\b/i] },
  { kind: "manual-copy-paste", patterns: [/\bcopy.?paste|manually (copy|enter|type|transfer)\b/i] },
  { kind: "multiple-apps", patterns: [/\b(multiple (apps?|tools?|systems?)|switch(ing)? between|different (apps?|tools?))\b/i] },
  { kind: "repeated-exports", patterns: [/\b(export(ing)? (every|each|regularly)|download.*then|re.?export)\b/i] },
  { kind: "custom-scripts", patterns: [/\b(script(ing|ed)?|wrote (a )?script|custom (code|script|solution)|python|bash|cron job)\b/i] },
  { kind: "temporary-hacks", patterns: [/\b(hack(y|ed)?|temporary (fix|solution)|band.?aid|duct tape|kludge)\b/i] },
  { kind: "human-processes", patterns: [/\b(someone (manually|has to)|team (manually|has to)|employee|person (has to|handles))\b/i] },
];

export function extractSignals(item: CollectedItem): Signal[] {
  const text = item.rawContent;
  const detectedTypes = detectSignalTypes(text);
  const workarounds = detectWorkarounds(text);
  const buyingIntent = detectBuyingIntent(text);

  if (detectedTypes.length === 0 && workarounds.length === 0) return [];

  const primaryType: SignalType = detectedTypes[0] ?? "problem";
  const signal: Signal = {
    id: generateId("sig"),
    itemId: item.id,
    source: item.source,
    type: primaryType,
    summary: buildSummary(text, primaryType),
    rawQuote: extractBestQuote(text, primaryType),
    workarounds,
    buyingIntent: buyingIntent.detected,
    buyingIntentEvidence: buyingIntent.evidence,
    category: item.category,
    extractedAt: nowIso(),
  };

  return [signal];
}

function detectSignalTypes(text: string): SignalType[] {
  const matched: SignalType[] = [];
  for (const { type, patterns } of SIGNAL_PATTERNS) {
    if (patterns.some((p) => p.test(text))) {
      matched.push(type);
    }
  }
  // Dedupe preserving insertion order
  return [...new Set(matched)];
}

function detectWorkarounds(text: string): WorkaroundKind[] {
  const found: WorkaroundKind[] = [];
  for (const { kind, patterns } of WORKAROUND_PATTERNS) {
    if (patterns.some((p) => p.test(text))) found.push(kind);
  }
  return found;
}

interface BuyingIntentResult {
  detected: boolean;
  evidence?: string;
}

const BUYING_INTENT_RE = [
  /\b(would (gladly |happily |definitely )?pay|willing to pay|pay (for|to|any(thing|one))|paid solution|premium|upgrade|switch|buy)\b/i,
  /\b(looking (to buy|for a paid|for something|to purchase)|considering (buying|switching|upgrading))\b/i,
  /\b(budget (for|allocated)|our company (would|will|can) pay|enterprise plan|pricing (page|plan))\b/i,
  /\bif (it|this|there was|someone built|you (added|built|made))\b.*\b(I('d| would)|we('d| would))\b/i,
];

function detectBuyingIntent(text: string): BuyingIntentResult {
  for (const re of BUYING_INTENT_RE) {
    const match = re.exec(text);
    if (match) {
      const start = Math.max(0, (match.index ?? 0) - 40);
      const end = Math.min(text.length, (match.index ?? 0) + 120);
      return { detected: true, evidence: text.slice(start, end).trim() };
    }
  }
  return { detected: false };
}

function buildSummary(text: string, type: SignalType): string {
  // Use first 200 chars of text as summary base
  const base = text.replace(/\s+/g, " ").trim().slice(0, 200);
  return `[${type}] ${base}${base.length === 200 ? "…" : ""}`;
}

function extractBestQuote(text: string, type: SignalType): string {
  const patterns = SIGNAL_PATTERNS.find((p) => p.type === type)?.patterns ?? [];
  for (const re of patterns) {
    const match = re.exec(text);
    if (match) {
      const start = Math.max(0, (match.index ?? 0) - 20);
      const end = Math.min(text.length, (match.index ?? 0) + 180);
      return text.slice(start, end).replace(/\s+/g, " ").trim();
    }
  }
  return text.slice(0, 200).replace(/\s+/g, " ").trim();
}
