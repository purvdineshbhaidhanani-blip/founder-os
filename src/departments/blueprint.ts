import { getTemplate } from "../templates/registry.js";
import type { AgentBlueprint } from "../types/blueprint.js";
import type { AgentSpec } from "./types.js";

export const DEPARTMENT_OWNER = "engineering-department";

/** Collaborators = union(receivesFrom, sendsTo, reportsTo) minus self and the founder. */
function collaborators(spec: AgentSpec): string[] {
  const all = [...spec.receivesFrom, ...spec.sendsTo, spec.reportsTo];
  const unique = [...new Set(all)].filter((name) => name !== spec.name && name !== "founder");
  return unique.sort();
}

function names(list: string[]): string {
  return list.length > 0 ? list.join(", ") : "the Master Orchestrator";
}

/**
 * Builds a complete, schema-valid blueprint for a department agent. The
 * matching category template supplies tool permissions, workflow scaffold,
 * reporting format and failure behaviour; the spec overrides identity, role,
 * responsibilities, objectives and the collaboration wiring so each agent is
 * distinct and production-ready.
 *
 * The communication protocol is written so every generated agent documents
 * its Runtime integration verbatim: work arrives from named upstream agents,
 * results flow to named downstream agents through the Artifact Manager and
 * shared memory, and failures escalate via the Event Bus with retries and
 * approvals handled by the Master Orchestrator.
 */
export function buildDepartmentBlueprint(spec: AgentSpec, owner: string = DEPARTMENT_OWNER): AgentBlueprint {
  const base = getTemplate(spec.category).build({
    name: spec.name,
    displayName: spec.displayName,
    owner,
    summary: spec.summary,
    tags: [...new Set(["engineering-department", spec.department, ...(spec.tags ?? [])])],
  });

  return {
    ...base,
    role: spec.role,
    responsibilities: spec.responsibilities,
    objectives: spec.objectives,
    inputs: spec.inputs ?? base.inputs,
    outputs: spec.outputs ?? base.outputs,
    communicationProtocol: {
      inputFormat: `Receives work from ${names(spec.receivesFrom)} via the Master Orchestrator's task queue, with task context loaded by the Context Manager.`,
      outputFormat: `Delivers results to ${names(spec.sendsTo)}; artifacts are published through the Artifact Manager and recorded in shared memory, then announced on the Event Bus.`,
      escalationPath: `Reports to ${spec.reportsTo}. On failure, emits a failure event on the Event Bus; the Master Orchestrator applies the task-queue retry policy and routes any human-gated step through the Approval System before resuming the workflow.`,
      collaboratesWith: collaborators(spec),
    },
  };
}
