import type { Signal, WorkaroundKind } from "./types.js";

// ---------------------------------------------------------------------------
// Repetition Engine — clusters semantically similar signals into problem groups.
// Uses lightweight text fingerprinting (no external deps required).
// ---------------------------------------------------------------------------

export interface SignalCluster {
  /** Stable normalised key identifying the problem. */
  clusterKey: string;
  /** Human-readable label derived from the most common terms. */
  label: string;
  signals: Signal[];
  /** All unique workaround kinds present across signals in this cluster. */
  workarounds: WorkaroundKind[];
  /** Count of signals with buying intent. */
  buyingIntentCount: number;
  /** Unique sources represented. */
  sources: Set<string>;
}

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "is", "was", "are", "be", "been", "have", "has", "do",
  "does", "did", "not", "it", "its", "this", "that", "my", "our", "we",
  "i", "you", "they", "he", "she", "can", "would", "could", "should",
  "will", "would", "when", "where", "what", "how", "why", "who",
]);

/**
 * Groups signals into clusters by problem fingerprint.
 * Clusters with >= minClusterSize signals form the output.
 */
export function clusterSignals(signals: Signal[], minClusterSize = 1): SignalCluster[] {
  const clusters = new Map<string, SignalCluster>();

  for (const signal of signals) {
    const key = fingerprint(signal.summary + " " + signal.rawQuote, signal.category);
    const existing = clusters.get(key);
    if (existing) {
      existing.signals.push(signal);
      for (const w of signal.workarounds) existing.workarounds.push(w);
      if (signal.buyingIntent) existing.buyingIntentCount++;
      existing.sources.add(signal.source);
    } else {
      clusters.set(key, {
        clusterKey: key,
        label: buildLabel(signal.summary),
        signals: [signal],
        workarounds: [...signal.workarounds],
        buyingIntentCount: signal.buyingIntent ? 1 : 0,
        sources: new Set([signal.source]),
      });
    }
  }

  const out = [...clusters.values()].filter((c) => c.signals.length >= minClusterSize);
  // Sort: buying intent first, then by signal count, then workaround count
  out.sort((a, b) => {
    const bScore = b.buyingIntentCount * 10 + b.signals.length + b.workarounds.length;
    const aScore = a.buyingIntentCount * 10 + a.signals.length + a.workarounds.length;
    return bScore - aScore;
  });

  return out;
}

/**
 * Produces a stable short key for a piece of text.
 * Strips stop words, stems crudely, takes the 5 most significant terms,
 * and sorts them so word order doesn't matter.
 */
function fingerprint(text: string, category: string): string {
  const terms = tokenise(text)
    .filter((t) => !STOP_WORDS.has(t) && t.length > 3)
    .map(crudeStem)
    .slice(0, 8);

  // Count term frequency
  const freq = new Map<string, number>();
  for (const t of terms) freq.set(t, (freq.get(t) ?? 0) + 1);

  // Take top 5 by frequency, then sort for stability
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t)
    .sort();

  return `${category}:${top.join("_")}`;
}

function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function crudeStem(word: string): string {
  // Strip common English suffixes — good enough for fingerprinting
  return word
    .replace(/ing$/, "")
    .replace(/tion$/, "")
    .replace(/ness$/, "")
    .replace(/ment$/, "")
    .replace(/ies$/, "y")
    .replace(/([^aeiou])es$/, "$1")
    .replace(/([^aeiou])s$/, "$1")
    .replace(/ed$/, "");
}

function buildLabel(summary: string): string {
  // Strip the [type] prefix from signal summaries
  return summary.replace(/^\[[^\]]+\]\s*/, "").slice(0, 80).trim();
}
