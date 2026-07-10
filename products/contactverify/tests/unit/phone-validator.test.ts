import { describe, expect, it } from "vitest";
import { validatePhone } from "../../lib/services/phone-validator.js";

describe("validatePhone", () => {
  it("marks a standard 10-digit US number as valid", () => {
    const result = validatePhone("(555) 123-4567");
    expect(result.status).toBe("valid");
    expect(result.digitCount).toBe(10);
  });

  it("marks a number with a country code as valid", () => {
    expect(validatePhone("+1 555 123 4567").status).toBe("valid");
  });

  it("marks a too-short number as invalid", () => {
    expect(validatePhone("12345").status).toBe("invalid");
  });

  it("marks a too-long number as invalid", () => {
    expect(validatePhone("1".repeat(20)).status).toBe("invalid");
  });

  it("marks an 8-digit number as risky", () => {
    expect(validatePhone("12345678").status).toBe("risky");
  });
});
