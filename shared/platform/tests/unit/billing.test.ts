import { describe, expect, it } from "vitest";
import { createPlanSchema, setPlanEntitlementSchema, createSubscriptionSchema, incrementUsageSchema } from "../../src/billing/validation.js";

describe("billing validation", () => {
  it("accepts a valid plan creation payload", () => {
    const result = createPlanSchema.safeParse({
      code: "pro",
      name: "Pro",
      billingInterval: "monthly",
      priceCents: 9900,
    });
    expect(result.success).toBe(true);
  });

  it("defaults currency to usd", () => {
    const result = createPlanSchema.parse({
      code: "pro",
      name: "Pro",
      billingInterval: "monthly",
      priceCents: 9900,
    });
    expect(result.currency).toBe("usd");
  });

  it("rejects a negative price", () => {
    const result = createPlanSchema.safeParse({
      code: "pro",
      name: "Pro",
      billingInterval: "monthly",
      priceCents: -100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a boolean entitlement", () => {
    const result = setPlanEntitlementSchema.safeParse({ featureKey: "use_ai_copilot", kind: "boolean", boolValue: true });
    expect(result.success).toBe(true);
  });

  it("accepts a numeric_limit entitlement with a null (unlimited) limit", () => {
    const result = setPlanEntitlementSchema.safeParse({ featureKey: "monthly_scans", kind: "numeric_limit", numericLimit: null });
    expect(result.success).toBe(true);
  });

  it("requires a valid organization UUID for subscription creation", () => {
    const result = createSubscriptionSchema.safeParse({
      organizationId: "not-a-uuid",
      planCode: "pro",
      billingInterval: "monthly",
    });
    expect(result.success).toBe(false);
  });

  it("caps trial days at 90", () => {
    const result = createSubscriptionSchema.safeParse({
      organizationId: "123e4567-e89b-12d3-a456-426614174000",
      planCode: "pro",
      billingInterval: "monthly",
      trialDays: 365,
    });
    expect(result.success).toBe(false);
  });

  it("defaults usage increment amount to 1", () => {
    const result = incrementUsageSchema.parse({
      organizationId: "123e4567-e89b-12d3-a456-426614174000",
      metricKey: "monthly_scans",
    });
    expect(result.amount).toBe(1);
  });
});
