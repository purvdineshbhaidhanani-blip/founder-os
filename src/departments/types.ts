import type { AgentCategory } from "../constants/categories.js";
import type { IoField } from "../types/blueprint.js";

export type DepartmentName =
  | "leadership"
  | "engineering"
  | "quality"
  | "product"
  | "platform"
  | "intelligence"
  | "foundation"
  | "product-discovery"
  | "app-generation"
  | "sales-marketing"
  | "customer-success"
  | "finance-legal";

/**
 * Declarative description of one department agent. The factory turns each
 * spec into a full AgentBlueprint by layering the spec's role/collaboration
 * over the matching category template (see buildDepartmentBlueprint). Specs
 * carry only what is agent-specific; permissions, tools, workflow shape,
 * reporting and failure behaviour come from the template.
 */
export interface AgentSpec {
  name: string;
  displayName: string;
  category: AgentCategory;
  department: DepartmentName;
  summary: string;
  role: string;
  responsibilities: string[];
  objectives: string[];
  /** Agent (or "founder") this role escalates to. Drives the escalation path. */
  reportsTo: string;
  /** Agents this role accepts work from. Drives the input format. */
  receivesFrom: string[];
  /** Agents this role hands finished work to. Drives the output format. */
  sendsTo: string[];
  tags?: string[];
  inputs?: IoField[];
  outputs?: IoField[];
}
