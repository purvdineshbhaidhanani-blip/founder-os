import type { CollectedItem } from "../types.js";

// ---------------------------------------------------------------------------
// Deduplicator
// Three-pass deduplication: URL → content fingerprint → word-set similarity
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Pass 1 — URL normalization (strip UTM + tracking params, trailing slash)
// ---------------------------------------------------------------------------

const TRACKING_PARAMS = /[?&](utm_[^&]+|ref=[^&]+|source=[^&]+|fbclid=[^&]+|gclid=[^&]+)/g;

function normalizeUrl(raw: string): string {
  return raw.replace(TRACKING_PARAMS, "").replace(/\/$/, "").toLowerCase().trim();
}

// ---------------------------------------------------------------------------
// Pass 2 — Content fingerprint (first 200 normalized chars)
// Lightweight alternative to cryptographic hash — avoids any Node.js crypto
// dependency and works in ESM without dynamic import.
// ---------------------------------------------------------------------------

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")  // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}

function contentFingerprint(item: CollectedItem): string {
  const normalized = normalizeText(item.rawContent).slice(0, 200);
  // djb2 hash — fast, no deps, good distribution for dedup purposes
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) ^ normalized.charCodeAt(i);
    hash = hash >>> 0;  // keep unsigned 32-bit
  }
  return `fp:${hash}`;
}

// ---------------------------------------------------------------------------
// Pass 3 — Word-set (Jaccard) similarity
// Two items are near-duplicates if their normalized word sets overlap ≥ 0.85
// ---------------------------------------------------------------------------

const JACCARD_THRESHOLD = 0.85;
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "is", "it", "this", "that", "with", "as", "by", "from", "we",
  "i", "my", "our", "you", "your", "they", "their", "be", "are", "was",
  "were", "have", "has", "do", "does", "not", "can", "will", "just",
]);

function wordSet(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

// ---------------------------------------------------------------------------
// Public result type
// ---------------------------------------------------------------------------

export interface DeduplicationResult {
  items: CollectedItem[];
  duplicatesRemoved: number;
}

// ---------------------------------------------------------------------------
// Main deduplication function
// ---------------------------------------------------------------------------

export function deduplicate(items: CollectedItem[]): DeduplicationResult {
  const urlSeen = new Set<string>();
  const fpSeen = new Set<string>();
  const wordSets: Array<{ words: Set<string>; item: CollectedItem }> = [];
  const unique: CollectedItem[] = [];

  for (const item of items) {
    // Pass 1: URL
    const urlKey = normalizeUrl(item.url);
    if (urlSeen.has(urlKey)) continue;

    // Pass 2: content fingerprint (only if content is non-trivial)
    const fp = item.rawContent.length > 40 ? contentFingerprint(item) : null;
    if (fp !== null && fpSeen.has(fp)) continue;

    // Pass 3: word-set similarity against already-accepted items
    const words = item.rawContent.length > 40 ? wordSet(item.rawContent) : new Set<string>();
    if (words.size >= 10) {
      let isDuplicate = false;
      for (const existing of wordSets) {
        if (jaccard(words, existing.words) >= JACCARD_THRESHOLD) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) continue;
    }

    urlSeen.add(urlKey);
    if (fp !== null) fpSeen.add(fp);
    if (words.size >= 10) wordSets.push({ words, item });
    unique.push(item);
  }

  return {
    items: unique,
    duplicatesRemoved: items.length - unique.length,
  };
}

export function deduplicateAcrossSources(
  itemsBySource: Array<{ source: string; items: CollectedItem[] }>,
): CollectedItem[] {
  const all = itemsBySource.flatMap((s) => s.items);
  return deduplicate(all).items;
}
