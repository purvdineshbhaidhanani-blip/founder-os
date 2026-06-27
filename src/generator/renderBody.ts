import type { AgentBlueprint } from "../types/blueprint.js";
import { FACTORY_VERSION } from "../constants/factory.js";
import { bulletList, kv, numberedSteps, section } from "./markdown.js";

export interface GenerationMetadata {
  generatedAt: string;
  blueprintHash: string;
}

const CANONICAL_DOCS = ["docs/ARCHITECTURE.md", "docs/USAGE.md", "docs/LIFECYCLE.md"];

function renderIdentity(blueprint: AgentBlueprint): string {
  const { identity } = blueprint;
  return [
    `# ${identity.displayName}`,
    "",
    `> ${identity.summary}`,
    "",
    kv("Category", identity.category),
    kv("Owner", identity.owner),
    kv("Tags", identity.tags.length > 0 ? identity.tags.join(", ") : "_None_"),
  ].join("\n");
}

function renderRole(blueprint: AgentBlueprint): string {
  return section("Role", blueprint.role);
}

function renderResponsibilities(blueprint: AgentBlueprint): string {
  return section("Responsibilities", bulletList(blueprint.responsibilities));
}

function renderObjectives(blueprint: AgentBlueprint): string {
  return section("Objectives", bulletList(blueprint.objectives));
}

function renderInputs(blueprint: AgentBlueprint): string {
  const body =
    blueprint.inputs.length === 0
      ? "_This agent takes no structured inputs beyond the task description._"
      : blueprint.inputs
          .map(
            (input) =>
              `- **${input.name}** (${input.required ? "required" : "optional"}${
                input.format ? `, ${input.format}` : ""
              }): ${input.description}`,
          )
          .join("\n");
  return section("Inputs", body);
}

function renderOutputs(blueprint: AgentBlueprint): string {
  const body = blueprint.outputs
    .map(
      (output) =>
        `- **${output.name}** (${output.required ? "required" : "optional"}${
          output.format ? `, ${output.format}` : ""
        }): ${output.description}`,
    )
    .join("\n");
  return section("Outputs", body);
}

function renderWorkflow(blueprint: AgentBlueprint): string {
  const steps = [...blueprint.workflow]
    .sort((a, b) => a.order - b.order)
    .map((step) => `**${step.title}** — ${step.description}`);
  return section("Workflow", numberedSteps(steps));
}

function renderPermissions(blueprint: AgentBlueprint): string {
  const { permissions } = blueprint;
  const lines = [
    kv("Filesystem", permissions.filesystem),
    kv("Network", permissions.network),
    kv("Shell", permissions.shell),
    kv("Sensitive data access", permissions.sensitiveDataAccess),
    kv("Allowed tools", blueprint.allowedTools.join(", ")),
  ];
  return section("Permissions", lines.join("\n"));
}

function renderCommunicationProtocol(blueprint: AgentBlueprint): string {
  const { communicationProtocol } = blueprint;
  const lines = [
    kv("Input format", communicationProtocol.inputFormat),
    kv("Output format", communicationProtocol.outputFormat),
    kv("Escalation path", communicationProtocol.escalationPath),
    kv(
      "Collaborates with",
      communicationProtocol.collaboratesWith.length > 0
        ? communicationProtocol.collaboratesWith.join(", ")
        : "None",
    ),
  ];
  return section("Communication Protocol", lines.join("\n"));
}

function renderMemoryAccess(blueprint: AgentBlueprint): string {
  const { memoryAccess } = blueprint;
  const lines = [
    kv("Scope", memoryAccess.scope),
    kv("Persistent", memoryAccess.persistent),
    kv("Read paths", memoryAccess.readPaths.length > 0 ? memoryAccess.readPaths.join(", ") : "None"),
    kv("Write paths", memoryAccess.writePaths.length > 0 ? memoryAccess.writePaths.join(", ") : "None"),
  ];
  return section("Memory Access", lines.join("\n"));
}

function renderExecutionConstraints(blueprint: AgentBlueprint): string {
  const { executionConstraints } = blueprint;
  const lines = [
    kv("Autonomy level", executionConstraints.autonomyLevel),
    kv("Requires human approval", executionConstraints.requiresHumanApproval),
    kv("Max steps", executionConstraints.maxSteps ?? "Not limited"),
    kv("Timeout", executionConstraints.timeoutMinutes ? `${executionConstraints.timeoutMinutes} minutes` : "Not limited"),
    kv(
      "Forbidden actions",
      executionConstraints.forbiddenActions.length > 0
        ? executionConstraints.forbiddenActions.join(", ")
        : "None declared",
    ),
  ];
  return section("Execution Constraints", lines.join("\n"));
}

/**
 * Safety Rules are synthesized, not copied verbatim from any one blueprint
 * field — they translate permissions/constraints/failure-behavior into
 * imperative rules the agent must follow at runtime. This is the one section
 * every generated agent gets even if the blueprint author never thought to
 * write "don't do X" themselves.
 */
function renderSafetyRules(blueprint: AgentBlueprint): string {
  const { permissions, executionConstraints, failureBehavior, allowedTools } = blueprint;
  const rules: string[] = [
    `Never use a tool outside this list: ${allowedTools.join(", ")}.`,
  ];

  if (permissions.filesystem !== "read-write") {
    rules.push(`Never write or edit files — filesystem permission is "${permissions.filesystem}".`);
  }
  if (permissions.shell === "none") {
    rules.push("Never invoke shell/Bash commands.");
  }
  if (permissions.network === "none") {
    rules.push("Never make outbound network requests.");
  }
  if (permissions.sensitiveDataAccess === false) {
    rules.push("Never request, store, or transmit secrets or sensitive personal data.");
  }
  for (const action of executionConstraints.forbiddenActions) {
    rules.push(`Never ${action}.`);
  }
  if (executionConstraints.requiresHumanApproval) {
    rules.push("Pause and request human approval before taking any irreversible action.");
  }
  if (executionConstraints.maxSteps) {
    rules.push(`Stop and report progress if the task exceeds ${executionConstraints.maxSteps} steps.`);
  }
  if (executionConstraints.timeoutMinutes) {
    rules.push(`Stop and report progress if the task exceeds ${executionConstraints.timeoutMinutes} minutes.`);
  }
  rules.push(`On a blocker: ${failureBehavior.onBlocker}`);
  rules.push(`On ambiguity: ${failureBehavior.onAmbiguity}`);
  if (failureBehavior.escalateTo) {
    rules.push(`Escalate unresolved issues to: ${failureBehavior.escalateTo}.`);
  }

  return section("Safety Rules", bulletList(rules));
}

function renderReportingFormat(blueprint: AgentBlueprint): string {
  const { reportingFormat } = blueprint;
  const lines = [
    kv("Style", reportingFormat.style),
    kv("Required sections", reportingFormat.sections.join(", ")),
    kv("Frequency", reportingFormat.frequency ?? "On completion of each objective"),
  ];
  return section("Reporting Format", lines.join("\n"));
}

function renderSuccessCriteria(blueprint: AgentBlueprint): string {
  return section("Success Criteria", bulletList(blueprint.successCriteria));
}

function renderFailureBehavior(blueprint: AgentBlueprint): string {
  const { failureBehavior } = blueprint;
  const lines = [
    kv("On blocker", failureBehavior.onBlocker),
    kv("On ambiguity", failureBehavior.onAmbiguity),
    kv("Escalate to", failureBehavior.escalateTo ?? "Not specified"),
    kv("Rollback strategy", failureBehavior.rollbackStrategy ?? "Not applicable"),
  ];
  return section("Failure Behavior", lines.join("\n"));
}

function renderValidationMetadata(blueprint: AgentBlueprint, meta: GenerationMetadata): string {
  const lines = [
    kv("Blueprint name", blueprint.identity.name),
    kv("Blueprint content hash", meta.blueprintHash),
    kv("Generated at", meta.generatedAt),
    kv("Validation status", "PASSED — generator only emits agents that passed blueprint validation"),
  ];
  return section("Validation Metadata", lines.join("\n"));
}

function renderVersionMetadata(blueprint: AgentBlueprint): string {
  const lines = [
    kv("Agent version", blueprint.version),
    kv("Blueprint schema version", blueprint.schemaVersion),
    kv("Agent Factory version", FACTORY_VERSION),
  ];
  return section("Version Metadata", lines.join("\n"));
}

function renderDocumentation(blueprint: AgentBlueprint): string {
  const links = Array.from(new Set([...blueprint.documentationLinks, ...CANONICAL_DOCS]));
  return section("Documentation", bulletList(links.map((link) => `[${link}](/${link})`)));
}

/** Renders the full Markdown body (everything after the frontmatter block). */
export function buildBody(blueprint: AgentBlueprint, meta: GenerationMetadata): string {
  return [
    renderIdentity(blueprint),
    renderRole(blueprint),
    renderResponsibilities(blueprint),
    renderObjectives(blueprint),
    renderInputs(blueprint),
    renderOutputs(blueprint),
    renderWorkflow(blueprint),
    renderPermissions(blueprint),
    renderCommunicationProtocol(blueprint),
    renderMemoryAccess(blueprint),
    renderExecutionConstraints(blueprint),
    renderSafetyRules(blueprint),
    renderReportingFormat(blueprint),
    renderSuccessCriteria(blueprint),
    renderFailureBehavior(blueprint),
    renderValidationMetadata(blueprint, meta),
    renderVersionMetadata(blueprint),
    renderDocumentation(blueprint),
  ]
    .map((part) => part.trim())
    .join("\n\n");
}
