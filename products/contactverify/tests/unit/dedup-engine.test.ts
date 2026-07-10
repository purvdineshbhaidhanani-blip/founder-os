import { describe, expect, it } from "vitest";
import { findDuplicateGroups, levenshteinDistance, nameSimilarity, normalizeEmail, normalizePhone } from "../../lib/services/dedup-engine.js";

describe("normalizeEmail / normalizePhone", () => {
  it("lowercases and trims email", () => {
    expect(normalizeEmail("  Jane@Acme.COM ")).toBe("jane@acme.com");
  });

  it("strips a leading US country code from phone", () => {
    expect(normalizePhone("+1 555-123-4567")).toBe("5551234567");
  });
});

describe("levenshteinDistance", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshteinDistance("jane", "jane")).toBe(0);
  });

  it("returns 1 for a single-character difference", () => {
    expect(levenshteinDistance("jane", "jame")).toBe(1);
  });

  it("returns the length for an empty-vs-nonempty comparison", () => {
    expect(levenshteinDistance("", "jane")).toBe(4);
  });
});

describe("nameSimilarity", () => {
  it("returns 1 for identical names", () => {
    expect(nameSimilarity("Jane Doe", "jane doe")).toBe(1);
  });

  it("returns a high score for a near-identical name (typo)", () => {
    expect(nameSimilarity("Jane Doe", "Jane Doeh")).toBeGreaterThan(0.85);
  });

  it("returns a low score for very different names", () => {
    expect(nameSimilarity("Jane Doe", "Bob Smith")).toBeLessThan(0.5);
  });
});

describe("findDuplicateGroups", () => {
  it("groups contacts sharing a normalized email", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: "jane@acme.com", normalizedPhone: null, fullName: "Jane Doe", company: "Acme" },
      { id: "b", normalizedEmail: "jane@acme.com", normalizedPhone: null, fullName: "J Doe", company: "Acme" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matchedOn).toBe("email");
  });

  it("groups contacts by fuzzy name + same company when no email/phone match", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: null, normalizedPhone: null, fullName: "Jane Doe", company: "Acme" },
      { id: "b", normalizedEmail: null, normalizedPhone: null, fullName: "Jane Doeh", company: "Acme" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matchedOn).toBe("fuzzy_name");
  });

  it("does not group fuzzy-similar names at different companies", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: null, normalizedPhone: null, fullName: "Jane Doe", company: "Acme" },
      { id: "b", normalizedEmail: null, normalizedPhone: null, fullName: "Jane Doe", company: "Globex" },
    ]);
    expect(groups).toHaveLength(0);
  });

  it("returns no groups for distinct contacts", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: "jane@acme.com", normalizedPhone: null, fullName: "Jane Doe", company: "Acme" },
      { id: "b", normalizedEmail: "bob@acme.com", normalizedPhone: null, fullName: "Bob Smith", company: "Acme" },
    ]);
    expect(groups).toHaveLength(0);
  });
});
