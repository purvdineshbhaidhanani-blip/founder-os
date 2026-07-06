import { describe, expect, it } from "vitest";
import { errorMessage } from "../../web/src/lib/errors";
import { ApiError } from "../../web/src/api/client";

describe("errorMessage", () => {
  it("prefers an ApiError body message", () => {
    expect(errorMessage(new ApiError(422, { error: "Missing keys." }))).toBe("Missing keys.");
  });

  it("falls back to the ApiError's own message when the body has no error text", () => {
    expect(errorMessage(new ApiError(500, { error: "" }))).toBe("Request failed with status 500");
  });

  it("uses a plain Error's message", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  it("uses the provided fallback for non-Error throwables", () => {
    expect(errorMessage("weird", "Fallback here.")).toBe("Fallback here.");
    expect(errorMessage(undefined)).toBe("Something went wrong. Please try again.");
  });
});
