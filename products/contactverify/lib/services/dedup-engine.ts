export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Classic Levenshtein edit distance — used for fuzzy name/company matching per products/contactverify/docs/PRODUCT_IDENTITY.md §7 "fuzzy name/company matching." */
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)]);
  for (let j = 0; j < cols; j++) matrix[0]![j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[rows - 1]![cols - 1]!;
}

/** Normalized similarity in [0,1] derived from Levenshtein distance — 1 means identical. */
export function nameSimilarity(a: string, b: string): number {
  const normalizedA = a.trim().toLowerCase();
  const normalizedB = b.trim().toLowerCase();
  if (normalizedA.length === 0 && normalizedB.length === 0) return 1;
  const maxLength = Math.max(normalizedA.length, normalizedB.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(normalizedA, normalizedB) / maxLength;
}

export interface DedupCandidate {
  id: string;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
  fullName: string;
  company: string | null;
}

export interface DuplicateGroup {
  key: string;
  matchedOn: "email" | "phone" | "fuzzy_name";
  contactIds: string[];
}

const FUZZY_NAME_SIMILARITY_THRESHOLD = 0.85;

/** Groups contacts by exact email/phone match, then by fuzzy name+company similarity, per products/contactverify/docs/PRODUCT_IDENTITY.md §7 "Duplicate detection." */
export function findDuplicateGroups(contacts: DedupCandidate[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const claimed = new Set<string>();

  const byEmail = new Map<string, string[]>();
  for (const contact of contacts) {
    if (!contact.normalizedEmail) continue;
    const list = byEmail.get(contact.normalizedEmail) ?? [];
    list.push(contact.id);
    byEmail.set(contact.normalizedEmail, list);
  }
  for (const [email, ids] of byEmail) {
    if (ids.length < 2) continue;
    groups.push({ key: email, matchedOn: "email", contactIds: ids });
    for (const id of ids) claimed.add(id);
  }

  const byPhone = new Map<string, string[]>();
  for (const contact of contacts) {
    if (claimed.has(contact.id) || !contact.normalizedPhone) continue;
    const list = byPhone.get(contact.normalizedPhone) ?? [];
    list.push(contact.id);
    byPhone.set(contact.normalizedPhone, list);
  }
  for (const [phone, ids] of byPhone) {
    if (ids.length < 2) continue;
    groups.push({ key: phone, matchedOn: "phone", contactIds: ids });
    for (const id of ids) claimed.add(id);
  }

  const remaining = contacts.filter((c) => !claimed.has(c.id) && c.fullName.trim().length > 0 && c.company);
  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i]!;
    if (claimed.has(a.id)) continue;
    const matches = [a.id];
    for (let j = i + 1; j < remaining.length; j++) {
      const b = remaining[j]!;
      if (claimed.has(b.id)) continue;
      if (a.company !== b.company) continue;
      if (nameSimilarity(a.fullName, b.fullName) >= FUZZY_NAME_SIMILARITY_THRESHOLD) {
        matches.push(b.id);
      }
    }
    if (matches.length > 1) {
      groups.push({ key: `${a.fullName}@${a.company}`, matchedOn: "fuzzy_name", contactIds: matches });
      for (const id of matches) claimed.add(id);
    }
  }

  return groups;
}
