import { describe, expect, it } from "vitest";
import { validateEmail } from "../../lib/services/email-validator.js";

describe("validateEmail", () => {
  it("marks a well-formed email as valid", () => {
    expect(validateEmail("jane@acme.com").status).toBe("valid");
  });

  it("marks an email with no @ as invalid", () => {
    expect(validateEmail("not-an-email").status).toBe("invalid");
  });

  it("marks an email with an invalid domain shape as invalid", () => {
    expect(validateEmail("jane@acme").status).toBe("invalid");
  });

  it("marks a disposable-domain email as risky", () => {
    const result = validateEmail("test@mailinator.com");
    expect(result.status).toBe("risky");
    expect(result.isDisposable).toBe(true);
  });

  it("marks a valid non-disposable email as not disposable", () => {
    expect(validateEmail("jane@acme.com").isDisposable).toBe(false);
  });
});
