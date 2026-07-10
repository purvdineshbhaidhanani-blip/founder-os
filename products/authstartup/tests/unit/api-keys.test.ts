import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "../../lib/services/api-keys.js";

describe("generateApiKey", () => {
  it("produces a raw key with the as_ prefix and a matching hash", () => {
    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    expect(rawKey.startsWith("as_")).toBe(true);
    expect(keyPrefix).toBe(rawKey.slice(0, 8));
    expect(keyHash).toBe(hashApiKey(rawKey));
  });

  it("generates a different raw key every call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
  });
});

describe("verifyApiKey", () => {
  it("verifies a matching key/hash pair", () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(verifyApiKey(rawKey, keyHash)).toBe(true);
  });

  it("rejects a mismatched key", () => {
    const { keyHash } = generateApiKey();
    expect(verifyApiKey("as_wrongkey", keyHash)).toBe(false);
  });
});
