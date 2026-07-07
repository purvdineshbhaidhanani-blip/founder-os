import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/identity/password.js";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash (different salt) for the same password each time", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password", a)).toBe(true);
    expect(await verifyPassword("same-password", b)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    expect(await verifyPassword("anything", "not-a-real-hash")).toBe(false);
    expect(await verifyPassword("anything", "scrypt$badsalt")).toBe(false);
  });
});
