import { z } from "zod";
import { zodIssuesToValidation, type ValidationResult } from "../shared/validation.js";
import { AUTH_MODES, BILLING_MODES, PRODUCT_TYPES, type ProductDefinition } from "./types.js";

// Kept structurally in sync with `ProductDefinition` by the type assertion on
// `parseProductDefinition`'s return value below, rather than a `satisfies`
// clause here — Zod's `.default()` makes the schema's *input* type looser
// than its *output* type, which a `ZodType<ProductDefinition>` constraint
// (invariant over input) can't express.

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const ProductDefinitionSchema = z.object({
  name: z
    .string()
    .min(1, "name is required")
    .max(63, "name must be 63 characters or fewer")
    .regex(NAME_PATTERN, "name must be lowercase kebab-case (e.g. \"acme-billing\")"),
  description: z.string().optional(),
  type: z.enum(PRODUCT_TYPES),
  modules: z.array(z.string().min(1)).default([]),
  authMode: z.enum(AUTH_MODES),
  billingMode: z.enum(BILLING_MODES),
  aiEnabled: z.boolean(),
  teamsEnabled: z.boolean(),
  featureFlagsEnabled: z.boolean(),
  storageEnabled: z.boolean(),
});

/** Validates shape only (Zod). Use `validateProductDefinition` for shape + semantics. */
export function parseProductDefinition(raw: unknown): ValidationResult<ProductDefinition> {
  const parsed = ProductDefinitionSchema.safeParse(raw);
  if (!parsed.success) return { valid: false, issues: zodIssuesToValidation(parsed.error) };
  return { valid: true, value: parsed.data as ProductDefinition };
}

/** Shape (Zod) + cross-field semantic checks — the one function callers should use. */
export function validateProductDefinition(raw: unknown): ValidationResult<ProductDefinition> {
  const shapeResult = parseProductDefinition(raw);
  if (!shapeResult.valid) return shapeResult;

  const definition = shapeResult.value;
  const issues = [];
  const uniqueModules = new Set(definition.modules);
  if (uniqueModules.size !== definition.modules.length) {
    issues.push({ path: "modules", message: "modules must not contain duplicates." });
  }
  if (definition.billingMode !== "none" && definition.authMode === "none") {
    issues.push({
      path: "authMode",
      message: "billing requires an authMode other than \"none\" (billing needs an identity to bill).",
    });
  }

  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, value: definition };
}
