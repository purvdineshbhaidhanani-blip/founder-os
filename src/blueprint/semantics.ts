import type { AgentBlueprint } from "../types/blueprint.js";
import type { ValidationIssue, ValidationReport } from "../types/validation.js";

const WRITE_TOOLS = ["Write", "Edit", "NotebookEdit"];
const SHELL_TOOLS = ["Bash"];
const NETWORK_TOOLS = ["WebFetch", "WebSearch"];

/**
 * Cross-field semantic checks that a structural Zod schema can't express on
 * its own — e.g. "you declared Write in allowedTools but filesystem
 * permission is read-only." Pure function, no I/O, no registry access.
 */
export function validateBlueprintSemantics(blueprint: AgentBlueprint): ValidationReport {
  const issues: ValidationIssue[] = [];

  checkWorkflowOrdering(blueprint, issues);
  checkPermissionToolConsistency(blueprint, issues);
  checkMemoryAccessConsistency(blueprint, issues);
  checkAutonomyConsistency(blueprint, issues);
  checkSelfCollaboration(blueprint, issues);
  checkUniqueIoNames(blueprint, issues);
  checkDuplicateResponsibilities(blueprint, issues);
  checkForbiddenVsAllowed(blueprint, issues);

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}

function checkWorkflowOrdering(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  const orders = blueprint.workflow.map((step) => step.order).sort((a, b) => a - b);
  const expected = orders.map((_, index) => index + 1);
  const isSequential = orders.every((value, index) => value === expected[index]);
  if (!isSequential) {
    issues.push({
      code: "WORKFLOW_NON_SEQUENTIAL",
      severity: "error",
      message: `Workflow step "order" values must be 1..N with no gaps or duplicates. Got [${orders.join(", ")}].`,
      path: "workflow",
    });
  }
}

function checkPermissionToolConsistency(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  const { allowedTools, permissions } = blueprint;

  if (permissions.filesystem !== "read-write") {
    for (const tool of WRITE_TOOLS) {
      if (allowedTools.includes(tool)) {
        issues.push({
          code: "TOOL_PERMISSION_MISMATCH",
          severity: "error",
          message: `allowedTools includes "${tool}" but permissions.filesystem is "${permissions.filesystem}" (requires "read-write").`,
          path: "allowedTools",
        });
      }
    }
  }

  if (permissions.shell === "none") {
    for (const tool of SHELL_TOOLS) {
      if (allowedTools.includes(tool)) {
        issues.push({
          code: "TOOL_PERMISSION_MISMATCH",
          severity: "error",
          message: `allowedTools includes "${tool}" but permissions.shell is "none".`,
          path: "allowedTools",
        });
      }
    }
  }

  if (permissions.network === "none") {
    for (const tool of NETWORK_TOOLS) {
      if (allowedTools.includes(tool)) {
        issues.push({
          code: "TOOL_PERMISSION_MISMATCH",
          severity: "error",
          message: `allowedTools includes "${tool}" but permissions.network is "none".`,
          path: "allowedTools",
        });
      }
    }
  }
}

function checkMemoryAccessConsistency(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  const { memoryAccess } = blueprint;
  if (memoryAccess.scope === "none") {
    if (memoryAccess.readPaths.length > 0 || memoryAccess.writePaths.length > 0) {
      issues.push({
        code: "MEMORY_SCOPE_MISMATCH",
        severity: "error",
        message: 'memoryAccess.scope is "none" but readPaths/writePaths are non-empty.',
        path: "memoryAccess",
      });
    }
    if (memoryAccess.persistent) {
      issues.push({
        code: "MEMORY_SCOPE_MISMATCH",
        severity: "error",
        message: 'memoryAccess.scope is "none" but persistent is true.',
        path: "memoryAccess.persistent",
      });
    }
  }
}

function checkAutonomyConsistency(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  const { executionConstraints } = blueprint;
  if (executionConstraints.autonomyLevel === "supervised" && !executionConstraints.requiresHumanApproval) {
    issues.push({
      code: "AUTONOMY_APPROVAL_MISMATCH",
      severity: "warning",
      message: 'autonomyLevel is "supervised" but requiresHumanApproval is false; confirm this is intentional.',
      path: "executionConstraints",
    });
  }
}

function checkSelfCollaboration(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  if (blueprint.communicationProtocol.collaboratesWith.includes(blueprint.identity.name)) {
    issues.push({
      code: "SELF_COLLABORATION",
      severity: "error",
      message: `communicationProtocol.collaboratesWith lists "${blueprint.identity.name}", which is this agent itself.`,
      path: "communicationProtocol.collaboratesWith",
    });
  }
}

function checkUniqueIoNames(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  for (const [label, fields] of [
    ["inputs", blueprint.inputs],
    ["outputs", blueprint.outputs],
  ] as const) {
    const seen = new Set<string>();
    for (const field of fields) {
      const key = field.name.toLowerCase();
      if (seen.has(key)) {
        issues.push({
          code: "DUPLICATE_IO_NAME",
          severity: "error",
          message: `Duplicate ${label} field name "${field.name}".`,
          path: label,
        });
      }
      seen.add(key);
    }
  }
}

function checkDuplicateResponsibilities(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  const seen = new Set<string>();
  for (const responsibility of blueprint.responsibilities) {
    const key = responsibility.trim().toLowerCase();
    if (seen.has(key)) {
      issues.push({
        code: "DUPLICATE_RESPONSIBILITY",
        severity: "warning",
        message: `Responsibility "${responsibility}" is listed more than once.`,
        path: "responsibilities",
      });
    }
    seen.add(key);
  }
}

function checkForbiddenVsAllowed(blueprint: AgentBlueprint, issues: ValidationIssue[]): void {
  const allowed = new Set(blueprint.allowedTools.map((tool) => tool.toLowerCase()));
  for (const action of blueprint.executionConstraints.forbiddenActions) {
    if (allowed.has(action.toLowerCase())) {
      issues.push({
        code: "FORBIDDEN_ALLOWED_CONFLICT",
        severity: "error",
        message: `"${action}" appears in both allowedTools and executionConstraints.forbiddenActions.`,
        path: "executionConstraints.forbiddenActions",
      });
    }
  }
}
