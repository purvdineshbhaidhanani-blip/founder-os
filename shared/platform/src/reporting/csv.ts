/**
 * CSV export per RFC 4180: fields containing a comma, quote, or newline are
 * quoted, with embedded quotes doubled. Hand-rolled rather than a
 * dependency — the escaping rules are simple enough that a library adds
 * more surface area than it saves.
 */
function escapeCsvField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0 && !columns) return "";
  const keys = columns ?? (Object.keys(rows[0] ?? {}) as (keyof T)[]);

  const header = keys.map((k) => escapeCsvField(String(k))).join(",");
  const lines = rows.map((row) => keys.map((k) => escapeCsvField(row[k])).join(","));

  return [header, ...lines].join("\r\n");
}
