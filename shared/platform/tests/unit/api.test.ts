import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseOrThrow } from "../../src/api/validation.js";
import { paginate, resolveLimit } from "../../src/api/pagination.js";
import { toErrorResponseBody, toSuccessResponseBody } from "../../src/api/response.js";
import { PlatformError, validationError } from "../../src/errors/index.js";

describe("parseOrThrow", () => {
  const schema = z.object({ email: z.string().email(), age: z.number().int().positive() });

  it("returns parsed data on success", () => {
    const result = parseOrThrow(schema, { email: "a@b.com", age: 30 });
    expect(result).toEqual({ email: "a@b.com", age: 30 });
  });

  it("throws a validationError with per-field details on failure", () => {
    try {
      parseOrThrow(schema, { email: "not-an-email", age: -1 });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(PlatformError);
      const platformErr = err as PlatformError;
      expect(platformErr.code).toBe("VALIDATION_ERROR");
      expect(platformErr.details).toBeDefined();
      expect(platformErr.details!.some((d) => d.field === "email")).toBe(true);
      expect(platformErr.details!.some((d) => d.field === "age")).toBe(true);
    }
  });
});

describe("resolveLimit", () => {
  it("defaults to 20 when unspecified", () => {
    expect(resolveLimit(undefined)).toBe(20);
  });

  it("caps at 100 regardless of what's requested", () => {
    expect(resolveLimit(500)).toBe(100);
  });

  it("respects a valid requested limit", () => {
    expect(resolveLimit(5)).toBe(5);
  });
});

describe("paginate", () => {
  it("returns hasMore=false when fewer rows than the limit exist", async () => {
    const rows = [{ id: "1" }, { id: "2" }];
    const result = await paginate({
      limit: 10,
      findMany: async () => rows,
    });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.nextCursor).toBeUndefined();
  });

  it("trims the over-fetched row and sets nextCursor when more rows exist", async () => {
    const rows = [{ id: "1" }, { id: "2" }, { id: "3" }]; // limit+1
    const result = await paginate({
      limit: 2,
      findMany: async (args) => {
        expect(args.take).toBe(3);
        return rows;
      },
    });
    expect(result.data).toHaveLength(2);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBe("2");
  });

  it("passes the cursor through to findMany", async () => {
    let receivedArgs: unknown;
    await paginate({
      cursor: "abc",
      limit: 5,
      findMany: async (args) => {
        receivedArgs = args;
        return [];
      },
    });
    expect(receivedArgs).toMatchObject({ cursor: { id: "abc" }, skip: 1, take: 6 });
  });
});

describe("toErrorResponseBody", () => {
  it("maps a PlatformError to the standard shape with its own http status", () => {
    const { status, body } = toErrorResponseBody(validationError([{ field: "email", issue: "Invalid" }]), "req_1");
    expect(status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.requestId).toBe("req_1");
    expect(body.error.details).toEqual([{ field: "email", issue: "Invalid" }]);
  });

  it("maps an unexpected error to a generic 500 without leaking internals", () => {
    const { status, body } = toErrorResponseBody(new Error("some internal SQL detail"), "req_2");
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).not.toContain("SQL");
  });
});

describe("toSuccessResponseBody", () => {
  it("wraps data in a data envelope", () => {
    expect(toSuccessResponseBody({ id: "1" })).toEqual({ data: { id: "1" } });
  });
});
