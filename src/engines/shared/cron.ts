/**
 * Minimal standard 5-field cron parser/matcher (`minute hour dom month dow`),
 * shared by the Workflow Engine's scheduling interface and the Automation
 * Engine's cron abstraction so there is exactly one cron implementation in
 * the platform, not two competing ones.
 *
 * Supports "*", step values (e.g. "star-slash-n"), ranges ("a-b"), stepped
 * ranges, and comma-separated lists — the subset that covers the
 * overwhelming majority of real-world cron expressions without pulling in a
 * third-party dependency.
 */

export interface CronField {
  min: number;
  max: number;
}

const FIELDS: CronField[] = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12 }, // month
  { min: 0, max: 6 }, // day of week (0 = Sunday)
];

function parseField(raw: string, field: CronField): Set<number> {
  const values = new Set<number>();
  for (const part of raw.split(",")) {
    const [rangePart = "*", stepPart] = part.split("/");
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isFinite(step) || step <= 0) {
      throw new Error(`Invalid cron step "${part}"`);
    }
    let start = field.min;
    let end = field.max;
    if (rangePart !== "*") {
      if (rangePart.includes("-")) {
        const [a, b] = rangePart.split("-").map(Number);
        if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error(`Invalid cron range "${part}"`);
        start = a!;
        end = b!;
      } else {
        const n = Number(rangePart);
        if (!Number.isFinite(n)) throw new Error(`Invalid cron value "${part}"`);
        start = n;
        end = n;
      }
    }
    for (let v = start; v <= end; v += step) {
      if (v >= field.min && v <= field.max) values.add(v);
    }
  }
  return values;
}

export interface ParsedCron {
  minute: Set<number>;
  hour: Set<number>;
  dayOfMonth: Set<number>;
  month: Set<number>;
  dayOfWeek: Set<number>;
}

export function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(`Cron expression must have 5 fields, got "${expression}"`);
  }
  return {
    minute: parseField(parts[0]!, FIELDS[0]!),
    hour: parseField(parts[1]!, FIELDS[1]!),
    dayOfMonth: parseField(parts[2]!, FIELDS[2]!),
    month: parseField(parts[3]!, FIELDS[3]!),
    dayOfWeek: parseField(parts[4]!, FIELDS[4]!),
  };
}

export function cronMatches(parsed: ParsedCron, date: Date): boolean {
  return (
    parsed.minute.has(date.getMinutes()) &&
    parsed.hour.has(date.getHours()) &&
    parsed.dayOfMonth.has(date.getDate()) &&
    parsed.month.has(date.getMonth() + 1) &&
    parsed.dayOfWeek.has(date.getDay())
  );
}

/** Finds the next matching minute at or after `from`, bounded to avoid a runaway loop. */
export function nextCronFireTime(expression: string, from: Date, maxMinutesAhead = 366 * 24 * 60): Date {
  const parsed = parseCron(expression);
  const candidate = new Date(from);
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);
  for (let i = 0; i < maxMinutesAhead; i++) {
    if (cronMatches(parsed, candidate)) return candidate;
    candidate.setMinutes(candidate.getMinutes() + 1);
  }
  throw new Error(`No cron fire time found for "${expression}" within ${maxMinutesAhead} minutes`);
}
