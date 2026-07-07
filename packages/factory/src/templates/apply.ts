import { validateProductDefinition } from "../product/schema.js";
import type { ProductDefinition, ProductType } from "../product/types.js";
import type { ValidationResult } from "@platform/shared";
import { getProjectTemplate } from "./catalog.js";

export type ProductOverrides = Partial<Omit<ProductDefinition, "type">> & { name: string };

/** Merges a template's defaults with caller overrides and validates the result — the one path to a valid `ProductDefinition` from a template. */
export function applyTemplate(type: ProductType, overrides: ProductOverrides): ValidationResult<ProductDefinition> {
  const template = getProjectTemplate(type);
  const candidate: ProductDefinition = {
    ...template.defaults,
    ...overrides,
    type,
    modules: overrides.modules ?? template.defaults.modules,
  };
  return validateProductDefinition(candidate);
}
