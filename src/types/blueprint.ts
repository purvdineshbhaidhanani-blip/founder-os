import { z } from "zod";
import { AGENT_CATEGORIES } from "../constants/categories.js";
import { isKnownTool } from "../constants/tools.js";

/**
 * The Agent Blueprint is the single source of truth for "what is this agent."
 * Every generated agent in `.claude/agents/` traces back to exactly one
 * blueprint. The Agent Generator (Phase 3) only ever reads this shape; the
 * Agent Validator (Phase 4) only ever checks output against this shape.
 *
 * Treat this schema as a public contract: widen it (optional fields, new
 * enum members) freely, but breaking an existing field requires bumping
 * BLUEPRINT_SCHEMA_VERSION in src/constants/factory.ts.
 */

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const ModelPreferenceSchema = z.enum(["inherit", "sonnet", "opus", "haiku", "fable"]);
export type ModelPreference = z.infer<typeof ModelPreferenceSchema>;

export const IdentitySchema = z.object({
  name: z
    .string()
    .regex(SLUG_PATTERN, "identity.name must be kebab-case, e.g. 'code-reviewer'")
    .min(3)
    .max(64)
    .describe("Machine name; becomes the filename and registry key."),
  displayName: z.string().min(2).max(80).describe("Human-readable name."),
  category: z.enum(AGENT_CATEGORIES).describe("One of the canonical template categories."),
  summary: z
    .string()
    .min(10)
    .max(240)
    .describe("One-line description; seeds the frontmatter `description` field."),
  owner: z.string().min(1).describe("Team or person accountable for this agent."),
  tags: z.array(z.string().min(1)).default([]),
});
export type Identity = z.infer<typeof IdentitySchema>;

export const IoFieldSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  required: z.boolean().default(true),
  format: z.string().optional().describe("Expected shape, e.g. 'markdown', 'json', 'file-diff'."),
});
export type IoField = z.infer<typeof IoFieldSchema>;

export const WorkflowStepSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;

export const PermissionsSchema = z.object({
  filesystem: z.enum(["none", "read-only", "read-write"]).default("read-only"),
  network: z.enum(["none", "outbound-only", "full"]).default("none"),
  shell: z.enum(["none", "restricted", "full"]).default("none"),
  sensitiveDataAccess: z.boolean().default(false),
});
export type Permissions = z.infer<typeof PermissionsSchema>;

export const ToolNameSchema = z.string().refine(isKnownTool, (tool) => ({
  message: `Unknown tool "${tool}". Must be a core tool, "*", or an "mcp__" namespaced tool.`,
}));

export const CommunicationProtocolSchema = z.object({
  inputFormat: z.string().min(1).describe("How requests/tasks reach this agent."),
  outputFormat: z.string().min(1).describe("How this agent reports back."),
  escalationPath: z.string().min(1).describe("Who/what this agent escalates to when stuck."),
  collaboratesWith: z.array(z.string()).default([]).describe("Names of other agents this one hands off to."),
});
export type CommunicationProtocol = z.infer<typeof CommunicationProtocolSchema>;

export const MemoryAccessSchema = z.object({
  scope: z.enum(["none", "session", "project", "global"]).default("session"),
  readPaths: z.array(z.string()).default([]),
  writePaths: z.array(z.string()).default([]),
  persistent: z.boolean().default(false),
});
export type MemoryAccess = z.infer<typeof MemoryAccessSchema>;

export const ExecutionConstraintsSchema = z.object({
  autonomyLevel: z.enum(["supervised", "semi-autonomous", "autonomous"]).default("supervised"),
  requiresHumanApproval: z.boolean().default(true),
  maxSteps: z.number().int().positive().optional(),
  timeoutMinutes: z.number().int().positive().optional(),
  forbiddenActions: z.array(z.string()).default([]),
});
export type ExecutionConstraints = z.infer<typeof ExecutionConstraintsSchema>;

export const ReportingFormatSchema = z.object({
  style: z.enum(["milestone-summary", "structured-report", "inline-comment", "free-form"]).default(
    "milestone-summary",
  ),
  sections: z.array(z.string().min(1)).min(1),
  frequency: z.string().optional().describe("e.g. 'after each milestone', 'on request'."),
});
export type ReportingFormat = z.infer<typeof ReportingFormatSchema>;

export const FailureBehaviorSchema = z.object({
  onBlocker: z.string().min(1).describe("What the agent does when it cannot proceed."),
  onAmbiguity: z.string().min(1).describe("What the agent does when requirements are unclear."),
  escalateTo: z.string().optional(),
  rollbackStrategy: z.string().optional(),
});
export type FailureBehavior = z.infer<typeof FailureBehaviorSchema>;

export const AgentBlueprintSchema = z.object({
  schemaVersion: z.string().min(1).describe("BLUEPRINT_SCHEMA_VERSION this blueprint was authored against."),
  version: z.string().min(1).default("1.0.0").describe("Blueprint's own semantic version."),
  identity: IdentitySchema,
  role: z.string().min(10).describe("A clear statement of who/what this agent is."),
  responsibilities: z.array(z.string().min(1)).min(1),
  objectives: z.array(z.string().min(1)).min(1),
  inputs: z.array(IoFieldSchema).default([]),
  outputs: z.array(IoFieldSchema).min(1),
  workflow: z.array(WorkflowStepSchema).min(1),
  permissions: PermissionsSchema.default({
    filesystem: "read-only",
    network: "none",
    shell: "none",
    sensitiveDataAccess: false,
  }),
  allowedTools: z.array(ToolNameSchema).min(1),
  model: ModelPreferenceSchema.default("inherit"),
  communicationProtocol: CommunicationProtocolSchema,
  memoryAccess: MemoryAccessSchema.default({
    scope: "session",
    readPaths: [],
    writePaths: [],
    persistent: false,
  }),
  executionConstraints: ExecutionConstraintsSchema.default({
    autonomyLevel: "supervised",
    requiresHumanApproval: true,
    forbiddenActions: [],
  }),
  reportingFormat: ReportingFormatSchema,
  successCriteria: z.array(z.string().min(1)).min(1),
  failureBehavior: FailureBehaviorSchema,
  documentationLinks: z.array(z.string()).default([]),
});

export type AgentBlueprint = z.infer<typeof AgentBlueprintSchema>;

/** Convenience alias used by generator/validator/registry signatures. */
export type Blueprint = AgentBlueprint;

/**
 * Minimal input required to scaffold a new blueprint from a template
 * (Template Library, Phase 6). Everything else is filled in by the template
 * and can be hand-edited afterward.
 */
export interface BlueprintScaffoldInput {
  /** Kebab-case machine name, e.g. "api-contract-reviewer". */
  name: string;
  displayName: string;
  owner: string;
  /** Overrides the template's default one-line summary, if provided. */
  summary?: string;
  tags?: string[];
}

/**
 * A Template Library entry: a category-specific factory function that turns
 * minimal scaffold input into a complete, schema-valid AgentBlueprint. Templates
 * own all the category-specific defaults (typical responsibilities, workflow,
 * tools) so blueprint authors only have to supply identity information.
 */
export interface BlueprintTemplate {
  templateName: string;
  category: Identity["category"];
  /** Human-readable guidance on when to reach for this template. */
  description: string;
  build(input: BlueprintScaffoldInput): AgentBlueprint;
}
