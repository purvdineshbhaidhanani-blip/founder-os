/**
 * Converts arbitrary agent display names into a kebab-case slug suitable for
 * use as a filename (.claude/agents/<slug>.md) and as a registry key.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** A slug is valid as an agent name if it round-trips through slugify unchanged and is non-empty. */
export function isValidSlug(value: string): boolean {
  return value.length > 0 && slugify(value) === value;
}
