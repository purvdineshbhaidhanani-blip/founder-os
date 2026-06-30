import type { WorkaroundKind } from "./types.js";

// ---------------------------------------------------------------------------
// Workaround detector — standalone utility for enriching items outside
// signal extraction (e.g. re-scanning stored items for new patterns).
// ---------------------------------------------------------------------------

export interface WorkaroundDetectionResult {
  workarounds: WorkaroundKind[];
  score: number; // 0–1; higher = more evidence the user built a workaround
  evidence: string[];
}

const PATTERNS: Array<{ kind: WorkaroundKind; re: RegExp; label: string }> = [
  { kind: "excel", re: /\b(excel|xlsx?|\.xls)\b/i, label: "Excel" },
  { kind: "google-sheets", re: /\b(google sheets?|gsheets?|google spreadsheet)\b/i, label: "Google Sheets" },
  { kind: "zapier", re: /\b(zapier|make\.com|integromat|zap)\b/i, label: "Zapier/Make" },
  { kind: "manual-copy-paste", re: /\b(copy.?paste|manually (copy|enter|type|transfer|update)|ctrl.?c ctrl.?v)\b/i, label: "Manual copy-paste" },
  {
    kind: "multiple-apps",
    re: /\b(switch(ing)? between (apps?|tools?|systems?)|multiple (apps?|tools?|platforms?|systems?)|using .* and .*together)\b/i,
    label: "Multiple apps",
  },
  { kind: "repeated-exports", re: /\b(export(ing)? every|download.*then upload|re.?export(ing)?|bulk export)\b/i, label: "Repeated exports" },
  {
    kind: "custom-scripts",
    re: /\b(wrote (a |my )?(python |bash |shell |node |js )?script|cron job|automation script|custom (code|automation|tool|bot)|selenium|playwright)\b/i,
    label: "Custom scripts",
  },
  { kind: "temporary-hacks", re: /\b(hack(y|ed)?|temp(orary)? (fix|solution)|band.?aid|duct tape|kludge|hotfix)\b/i, label: "Temporary hacks" },
  { kind: "human-processes", re: /\b(someone (manually|has to|checks?)|va (does|handles)|outsourc(ed|ing)|person (checks|does|handles))\b/i, label: "Human processes" },
];

export function detectWorkarounds(text: string): WorkaroundDetectionResult {
  const workarounds: WorkaroundKind[] = [];
  const evidence: string[] = [];

  for (const { kind, re, label } of PATTERNS) {
    const match = re.exec(text);
    if (match) {
      workarounds.push(kind);
      const start = Math.max(0, (match.index ?? 0) - 20);
      const end = Math.min(text.length, (match.index ?? 0) + 80);
      evidence.push(`${label}: "…${text.slice(start, end).replace(/\s+/g, " ").trim()}…"`);
    }
  }

  // Score: each unique workaround kind adds weight; having many kinds = strong signal
  const score = Math.min(1, workarounds.length * 0.2 + (workarounds.length > 2 ? 0.2 : 0));

  return { workarounds, score, evidence };
}
