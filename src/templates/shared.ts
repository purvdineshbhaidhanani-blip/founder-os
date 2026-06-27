import { BLUEPRINT_SCHEMA_VERSION } from "../constants/factory.js";
import type {
  AgentBlueprint,
  BlueprintScaffoldInput,
  CommunicationProtocol,
  ExecutionConstraints,
  FailureBehavior,
  IoField,
  MemoryAccess,
  Permissions,
  ReportingFormat,
  WorkflowStep,
} from "../types/blueprint.js";
import type { AgentCategory } from "../constants/categories.js";

/**
 * Everything a template needs to supply beyond the minimal scaffold input.
 * `buildFromDefaults` fills in the boilerplate (schema/version bookkeeping,
 * default memory/execution shapes) so each category file only has to state
 * what's actually category-specific.
 */
export interface TemplateDefaults {
  category: AgentCategory;
  defaultSummary: string;
  role: string;
  responsibilities: string[];
  objectives: string[];
  inputs: IoField[];
  outputs: IoField[];
  workflow: WorkflowStep[];
  permissions: Permissions;
  allowedTools: string[];
  model: AgentBlueprint["model"];
  communicationProtocol: CommunicationProtocol;
  memoryAccess?: MemoryAccess;
  executionConstraints?: ExecutionConstraints;
  reportingFormat: ReportingFormat;
  successCriteria: string[];
  failureBehavior: FailureBehavior;
  documentationLinks?: string[];
}

const DEFAULT_MEMORY_ACCESS: MemoryAccess = {
  scope: "session",
  readPaths: [],
  writePaths: [],
  persistent: false,
};

const DEFAULT_EXECUTION_CONSTRAINTS: ExecutionConstraints = {
  autonomyLevel: "supervised",
  requiresHumanApproval: true,
  forbiddenActions: [],
};

export function buildFromDefaults(
  input: BlueprintScaffoldInput,
  defaults: TemplateDefaults,
): AgentBlueprint {
  return {
    schemaVersion: BLUEPRINT_SCHEMA_VERSION,
    version: "1.0.0",
    identity: {
      name: input.name,
      displayName: input.displayName,
      category: defaults.category,
      summary: input.summary ?? defaults.defaultSummary,
      owner: input.owner,
      tags: input.tags ?? [],
    },
    role: defaults.role,
    responsibilities: defaults.responsibilities,
    objectives: defaults.objectives,
    inputs: defaults.inputs,
    outputs: defaults.outputs,
    workflow: defaults.workflow,
    permissions: defaults.permissions,
    allowedTools: defaults.allowedTools,
    model: defaults.model,
    communicationProtocol: defaults.communicationProtocol,
    memoryAccess: defaults.memoryAccess ?? DEFAULT_MEMORY_ACCESS,
    executionConstraints: defaults.executionConstraints ?? DEFAULT_EXECUTION_CONSTRAINTS,
    reportingFormat: defaults.reportingFormat,
    successCriteria: defaults.successCriteria,
    failureBehavior: defaults.failureBehavior,
    documentationLinks: defaults.documentationLinks ?? [],
  };
}
