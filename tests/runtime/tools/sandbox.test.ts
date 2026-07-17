import { describe, expect, it } from "vitest";
import path from "node:path";
import { isPathSandboxed, resolveSandboxedPath, SandboxViolationError } from "../../../src/runtime/tools/sandbox.js";

describe("resolveSandboxedPath", () => {
  const root = "/workspace/project";

  it("resolves a relative path inside the root", () => {
    expect(resolveSandboxedPath(root, "src/index.ts")).toBe(path.resolve(root, "src/index.ts"));
  });

  it("resolves the root itself", () => {
    expect(resolveSandboxedPath(root, ".")).toBe(path.resolve(root));
  });

  it("accepts an absolute path that is inside the root", () => {
    expect(resolveSandboxedPath(root, path.join(root, "a/b.txt"))).toBe(path.resolve(root, "a/b.txt"));
  });

  it("throws SandboxViolationError for a relative traversal escaping the root", () => {
    expect(() => resolveSandboxedPath(root, "../../etc/passwd")).toThrow(SandboxViolationError);
  });

  it("throws SandboxViolationError for an absolute path outside the root", () => {
    expect(() => resolveSandboxedPath(root, "/etc/passwd")).toThrow(SandboxViolationError);
  });

  it("throws SandboxViolationError for a sneaky traversal that only escapes after normalization", () => {
    expect(() => resolveSandboxedPath(root, "a/../../b")).toThrow(SandboxViolationError);
  });

  it("does not false-positive on a sibling directory that merely shares a name prefix", () => {
    // "/workspace/project-evil" is NOT inside "/workspace/project" even though it
    // shares a string prefix — path.relative must be used, not startsWith.
    expect(() => resolveSandboxedPath(root, "/workspace/project-evil/file.txt")).toThrow(SandboxViolationError);
  });
});

describe("isPathSandboxed", () => {
  it("returns true/false without throwing", () => {
    expect(isPathSandboxed("/workspace/project", "src/a.ts")).toBe(true);
    expect(isPathSandboxed("/workspace/project", "../outside.ts")).toBe(false);
  });
});
