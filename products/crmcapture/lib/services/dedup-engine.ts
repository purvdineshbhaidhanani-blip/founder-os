/** Normalizes an email for duplicate comparison: lowercase, trimmed. Gmail's dot-insensitivity/plus-addressing is deliberately NOT collapsed — that's a Gmail-specific quirk, not true duplication for arbitrary providers. */
export function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normalizes a phone number for duplicate comparison: strips everything but digits, drops a leading "1" (US country code) so "+1 555-123-4567" and "5551234567" match. */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  const withoutCountryCode = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return withoutCountryCode;
}

export interface DedupCandidate {
  id: string;
  normalizedEmail: string | null;
  normalizedPhone: string | null;
}

export interface DuplicateGroup {
  key: string;
  matchedOn: "email" | "phone";
  contactIds: string[];
}

/**
 * Groups contacts sharing a normalized email or phone number per
 * products/crmcapture/docs/PRODUCT_IDENTITY.md §7 "Deduplication: Detect
 * duplicate leads (same email, same phone) across lead sources and CRM."
 * Email matches take priority — a group is never re-split across the two
 * signals, so a contact never appears in more than one group.
 */
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
  }

  return groups;
}
