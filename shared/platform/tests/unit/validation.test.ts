import { describe, expect, it } from "vitest";
import { createOrganizationSchema, inviteMemberSchema } from "../../src/organizations/validation.js";
import { signUpWithPasswordSchema } from "../../src/auth/validation.js";

describe("organizations validation", () => {
  it("accepts a valid slug", () => {
    const result = createOrganizationSchema.safeParse({ name: "Acme Inc", slug: "acme-inc" });
    expect(result.success).toBe(true);
  });

  it("rejects a slug with uppercase or spaces", () => {
    expect(createOrganizationSchema.safeParse({ name: "Acme", slug: "Acme Inc" }).success).toBe(false);
    expect(createOrganizationSchema.safeParse({ name: "Acme", slug: "acme_inc" }).success).toBe(false);
  });

  it("defaults invite role to member", () => {
    const result = inviteMemberSchema.parse({ email: "person@example.com" });
    expect(result.role).toBe("member");
  });

  it("lowercases and trims invite email", () => {
    const result = inviteMemberSchema.parse({ email: "  Person@Example.com  " });
    expect(result.email).toBe("person@example.com");
  });
});

describe("auth validation", () => {
  it("rejects a password under 12 characters", () => {
    const result = signUpWithPasswordSchema.safeParse({
      email: "a@b.com",
      password: "short",
      displayName: "A",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid signup payload", () => {
    const result = signUpWithPasswordSchema.safeParse({
      email: "a@b.com",
      password: "correct-horse-battery-staple",
      displayName: "A B",
    });
    expect(result.success).toBe(true);
  });
});
