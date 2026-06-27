/** Small Markdown-rendering helpers shared by every section renderer in `renderBody.ts`. */

export function bulletList(items: string[], emptyText = "_None declared._"): string {
  if (items.length === 0) return emptyText;
  return items.map((item) => `- ${item}`).join("\n");
}

export function numberedSteps(items: string[], emptyText = "_None declared._"): string {
  if (items.length === 0) return emptyText;
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function kv(label: string, value: string | number | boolean): string {
  const rendered = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return `- **${label}:** ${rendered}`;
}

export function section(title: string, body: string): string {
  return `## ${title}\n\n${body.trim()}\n`;
}
