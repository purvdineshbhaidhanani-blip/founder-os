import { describe, expect, it } from "vitest";
import { contentHash } from "../src/utils/hash.js";
import { isValidSlug, slugify } from "../src/utils/slug.js";
import { isSemVer } from "../src/types/common.js";

describe("utils/hash", () => {
  it("produces the same hash for objects with reordered keys", () => {
    const a = { b: 1, a: 2 };
    const b = { a: 2, b: 1 };
    expect(contentHash(a)).toBe(contentHash(b));
  });

  it("produces a different hash when content changes", () => {
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });

  it("returns a 16-character hex string", () => {
    const hash = contentHash({ x: "y" });
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("utils/slug", () => {
  it("slugifies whitespace and casing", () => {
    expect(slugify("Backend API Implementer")).toBe("backend-api-implementer");
  });

  it("treats already-kebab strings as valid", () => {
    expect(isValidSlug("backend-api-implementer")).toBe(true);
  });

  it("rejects strings that change under slugify", () => {
    expect(isValidSlug("Backend Api")).toBe(false);
    expect(isValidSlug("backend--api")).toBe(false);
    expect(isValidSlug("")).toBe(false);
  });
});

describe("types/common", () => {
  it("accepts standard semver strings", () => {
    expect(isSemVer("1.0.0")).toBe(true);
    expect(isSemVer("0.2.10-rc.1")).toBe(true);
  });
  it("rejects malformed semver", () => {
    expect(isSemVer("1.0")).toBe(false);
    expect(isSemVer("v1.0.0")).toBe(false);
  });
});
