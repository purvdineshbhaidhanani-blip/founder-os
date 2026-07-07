import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/logger.js";

describe("@platform/core logger", () => {
  const originalLevel = process.env.PLATFORM_LOG_LEVEL;
  const originalFormat = process.env.PLATFORM_LOG_FORMAT;

  beforeEach(() => {
    delete process.env.PLATFORM_LOG_LEVEL;
    delete process.env.PLATFORM_LOG_FORMAT;
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.PLATFORM_LOG_LEVEL = originalLevel;
    process.env.PLATFORM_LOG_FORMAT = originalFormat;
    vi.restoreAllMocks();
  });

  it("defaults to info level, suppressing debug", () => {
    const logger = createLogger("test");
    logger.debug("hidden");
    logger.info("shown");
    expect(console.log).toHaveBeenCalledTimes(1);
    expect((console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toContain("shown");
  });

  it("honors PLATFORM_LOG_LEVEL to raise the threshold", () => {
    process.env.PLATFORM_LOG_LEVEL = "warn";
    const logger = createLogger("test");
    logger.info("hidden");
    logger.warn("shown");
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("routes error() to console.error and warn() to console.warn", () => {
    const logger = createLogger("test");
    logger.warn("w");
    logger.error("e");
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("includes the scope and message in text format by default", () => {
    const logger = createLogger("my-scope");
    logger.info("hello", { userId: "u1" });
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toContain("[my-scope]");
    expect(line).toContain("hello");
    expect(line).toContain("u1");
  });

  it("emits structured JSON when PLATFORM_LOG_FORMAT=json", () => {
    process.env.PLATFORM_LOG_FORMAT = "json";
    const logger = createLogger("my-scope");
    logger.info("hello", { userId: "u1" });
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({ level: "info", scope: "my-scope", message: "hello", userId: "u1" });
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("child() nests the scope with a colon separator", () => {
    const logger = createLogger("parent").child("child");
    logger.info("nested");
    const line = (console.log as ReturnType<typeof vi.fn>).mock.calls[0]![0] as string;
    expect(line).toContain("[parent:child]");
  });
});
