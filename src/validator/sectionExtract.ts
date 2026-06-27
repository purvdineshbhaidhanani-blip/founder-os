const HEADING_LINE = /^##\s+(.+?)\s*$/;

/** Splits a generated agent body into a map of heading -> raw section content. */
export function splitSections(body: string): Map<string, string> {
  const sections = new Map<string, string[]>();
  let current: string | null = null;

  for (const line of body.split("\n")) {
    const headingMatch = HEADING_LINE.exec(line);
    if (headingMatch) {
      current = headingMatch[1]!.trim();
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current) {
      sections.get(current)!.push(line);
    }
  }

  return new Map(Array.from(sections.entries()).map(([heading, lines]) => [heading, lines.join("\n")]));
}

/** Extracts the bullet-list items (`- ...` lines) under a `## <heading>` section. */
export function extractSectionBullets(body: string, heading: string): string[] {
  const content = splitSections(body).get(heading) ?? "";
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim());
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a.map((item) => item.toLowerCase().trim()));
  const setB = new Set(b.map((item) => item.toLowerCase().trim()));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}
