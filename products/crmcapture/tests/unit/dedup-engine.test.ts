import { describe, expect, it } from "vitest";
import { findDuplicateGroups, normalizeEmail, normalizePhone } from "../../lib/services/dedup-engine.js";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  John.Doe@Example.com ")).toBe("john.doe@example.com");
  });

  it("returns null for empty/missing input", () => {
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
  });
});

describe("normalizePhone", () => {
  it("strips formatting characters", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("5551234567");
  });

  it("strips a leading US country code", () => {
    expect(normalizePhone("+1 555-123-4567")).toBe("5551234567");
  });

  it("does not strip an 11-digit number not starting with 1", () => {
    expect(normalizePhone("44 555 123 4567")).toBe("445551234567");
  });

  it("returns null for empty/missing input", () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("findDuplicateGroups", () => {
  it("groups contacts sharing a normalized email", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: "jane@acme.com", normalizedPhone: null },
      { id: "b", normalizedEmail: "jane@acme.com", normalizedPhone: null },
      { id: "c", normalizedEmail: "other@acme.com", normalizedPhone: null },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matchedOn).toBe("email");
    expect(groups[0]?.contactIds.sort()).toEqual(["a", "b"]);
  });

  it("groups contacts sharing a normalized phone when email doesn't match", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: "jane@acme.com", normalizedPhone: "5551234567" },
      { id: "b", normalizedEmail: "jane2@acme.com", normalizedPhone: "5551234567" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matchedOn).toBe("phone");
  });

  it("does not double-count a contact already claimed by an email group", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: "jane@acme.com", normalizedPhone: "5551234567" },
      { id: "b", normalizedEmail: "jane@acme.com", normalizedPhone: "5559999999" },
      { id: "c", normalizedEmail: "other@acme.com", normalizedPhone: "5551234567" },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.matchedOn).toBe("email");
  });

  it("returns no groups when nothing matches", () => {
    const groups = findDuplicateGroups([
      { id: "a", normalizedEmail: "jane@acme.com", normalizedPhone: null },
      { id: "b", normalizedEmail: "bob@acme.com", normalizedPhone: null },
    ]);
    expect(groups).toHaveLength(0);
  });
});
