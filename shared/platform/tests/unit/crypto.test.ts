import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.PLATFORM_APP_ID = "test-app";
  process.env.PLATFORM_DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.PLATFORM_REDIS_URL = "redis://localhost:6379";
  process.env.PLATFORM_SESSION_SECRET = "a-test-session-secret-that-is-long-enough";
  process.env.PLATFORM_ENCRYPTION_KEY = "a-test-encryption-key-that-is-long-enough";
});

describe("crypto (encrypt/decrypt at rest)", () => {
  it("round-trips a plaintext secret", async () => {
    const { encryptAtRest, decryptAtRest } = await import("../../src/crypto/index.js");
    const envelope = encryptAtRest("my-totp-secret");
    expect(envelope).not.toBe("my-totp-secret");
    expect(decryptAtRest(envelope)).toBe("my-totp-secret");
  });

  it("produces a different ciphertext for the same plaintext on each call (random IV)", async () => {
    const { encryptAtRest } = await import("../../src/crypto/index.js");
    const a = encryptAtRest("same-input");
    const b = encryptAtRest("same-input");
    expect(a).not.toBe(b);
  });

  it("rejects a malformed envelope", async () => {
    const { decryptAtRest } = await import("../../src/crypto/index.js");
    expect(() => decryptAtRest("not-a-valid-envelope")).toThrow();
  });
});
