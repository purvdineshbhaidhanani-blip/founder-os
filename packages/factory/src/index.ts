/**
 * Universal SaaS Factory — configuration-driven tooling for standing up a
 * new product on top of the platform engines (Loop 2) and foundation (Loop
 * 1). Nothing here contains Founder OS logic or a hardcoded product name;
 * every capability is driven by a `ProductDefinition` value.
 */
export * as product from "./product/index.js";
export * as modules from "./modules/index.js";
export * as bootstrap from "./bootstrap/index.js";
export * as templates from "./templates/index.js";
export * as config from "./config/index.js";
export * as extensions from "./extensions/index.js";
export * as docs from "./docs/index.js";
export * as shared from "@platform/shared";
