/**
 * Mutually-exclusive attribute value groups used to detect identity
 * drift per products/characterconsistency/docs/PRODUCT_IDENTITY.md §7
 * "Pose memory: Generate the same character in new poses without
 * identity drift." If a character's locked description contains one
 * value from a group and a new generation request's text contains a
 * DIFFERENT value from the same group, that's a contradiction — the
 * classic drift failure mode (e.g. a blonde character request that
 * accidentally asks for "red hair").
 */
const ATTRIBUTE_GROUPS: string[][] = [
  ["blonde", "brunette", "black hair", "red hair", "gray hair", "silver hair", "auburn"],
  ["blue eyes", "green eyes", "brown eyes", "hazel eyes", "gray eyes"],
  ["slim", "athletic", "muscular", "heavyset", "petite", "curvy"],
  ["short hair", "long hair", "curly hair", "straight hair", "bald"],
  ["young adult", "middle-aged", "elderly", "child", "teenager"],
];

export interface DriftCheckResult {
  score: number;
  driftWarnings: string[];
}

/** Detects attribute contradictions between a character's locked description and a new generation request. */
export function checkConsistency(lockedDescription: string, requestDescription: string): DriftCheckResult {
  const locked = lockedDescription.toLowerCase();
  const request = requestDescription.toLowerCase();
  const driftWarnings: string[] = [];

  for (const group of ATTRIBUTE_GROUPS) {
    const lockedValue = group.find((value) => locked.includes(value));
    if (!lockedValue) continue;

    const conflictingValue = group.find((value) => value !== lockedValue && request.includes(value));
    if (conflictingValue) {
      driftWarnings.push(`Request mentions "${conflictingValue}" but this character is locked to "${lockedValue}".`);
    }
  }

  const score = Math.max(0, 100 - driftWarnings.length * 25);
  return { score, driftWarnings };
}
