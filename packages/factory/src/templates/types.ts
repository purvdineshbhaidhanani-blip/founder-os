import type { ProductDefinition, ProductType } from "../product/types.js";

export interface ProjectTemplate {
  id: ProductType;
  name: string;
  description: string;
  defaults: Omit<ProductDefinition, "name" | "description">;
}
