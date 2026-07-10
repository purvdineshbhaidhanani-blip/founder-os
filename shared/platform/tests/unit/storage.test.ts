import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.PLATFORM_APP_ID = "test-app";
  process.env.PLATFORM_DATABASE_URL = "postgresql://user:pass@localhost:5432/test";
  process.env.PLATFORM_REDIS_URL = "redis://localhost:6379";
  process.env.PLATFORM_SESSION_SECRET = "a-test-session-secret-that-is-long-enough";
  process.env.PLATFORM_ENCRYPTION_KEY = "a-test-encryption-key-that-is-long-enough";
});

describe("assertUploadAllowed", () => {
  it("accepts a valid PDF within the size limit", async () => {
    const { assertUploadAllowed } = await import("../../src/storage/validation.js");
    expect(() => assertUploadAllowed({ mimeType: "application/pdf", sizeBytes: 1024 })).not.toThrow();
  });

  it("rejects a disallowed mime type", async () => {
    const { assertUploadAllowed } = await import("../../src/storage/validation.js");
    expect(() => assertUploadAllowed({ mimeType: "application/x-executable", sizeBytes: 1024 })).toThrow();
  });

  it("rejects an empty file", async () => {
    const { assertUploadAllowed } = await import("../../src/storage/validation.js");
    expect(() => assertUploadAllowed({ mimeType: "application/pdf", sizeBytes: 0 })).toThrow();
  });

  it("rejects a file exceeding the max size", async () => {
    const { assertUploadAllowed } = await import("../../src/storage/validation.js");
    expect(() => assertUploadAllowed({ mimeType: "application/pdf", sizeBytes: 100, maxBytes: 50 })).toThrow();
  });
});

describe("isAllowedMimeType", () => {
  it("recognizes common allowed types", async () => {
    const { isAllowedMimeType } = await import("../../src/storage/validation.js");
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("audio/mpeg")).toBe(true);
  });

  it("rejects unlisted types", async () => {
    const { isAllowedMimeType } = await import("../../src/storage/validation.js");
    expect(isAllowedMimeType("application/x-msdownload")).toBe(false);
  });
});

describe("buildStorageKey", () => {
  it("scopes the key by app and organization, and sanitizes the filename", async () => {
    const { buildStorageKey } = await import("../../src/storage/service.js");
    const key = buildStorageKey({ organizationId: "org_123", category: "contracts", fileName: "my contract (final).pdf" });
    expect(key).toMatch(/^test-app\/org_123\/contracts\/[a-f0-9-]+-my_contract__final_\.pdf$/);
  });
});
