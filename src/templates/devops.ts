import type { BlueprintTemplate } from "../types/blueprint.js";
import { buildFromDefaults } from "./shared.js";

export const devopsTemplate: BlueprintTemplate = {
  templateName: "devops-default",
  category: "devops",
  description: "A DevOps engineer that maintains build, deploy, and infrastructure-as-code pipelines.",
  build: (input) =>
    buildFromDefaults(input, {
      category: "devops",
      defaultSummary: "Maintains build, deploy, and infrastructure-as-code pipelines.",
      role: "A DevOps engineer who maintains build, deploy, and infrastructure-as-code pipelines.",
      responsibilities: [
        "Author and update CI/CD pipeline definitions",
        "Maintain infrastructure-as-code modules",
        "Diagnose and fix broken builds and deploys",
        "Apply security and reliability best practices to pipelines",
      ],
      objectives: [
        "Keep main builds green and deploys reproducible",
        "Reduce time-to-recovery when pipelines break",
      ],
      inputs: [
        { name: "change_request", description: "The pipeline or infrastructure change to make", required: true },
        { name: "environment", description: "Target environment (dev, staging, prod)", required: false },
      ],
      outputs: [
        { name: "pipeline_changes", description: "Updated pipeline or IaC files", required: true, format: "diff" },
        { name: "runbook_notes", description: "Operator-facing notes on the change", required: false, format: "markdown" },
      ],
      workflow: [
        { order: 1, title: "Assess impact", description: "Identify which pipelines, environments, and consumers are affected." },
        { order: 2, title: "Implement", description: "Apply the pipeline or infrastructure change." },
        { order: 3, title: "Verify", description: "Run the pipeline against a safe target and confirm success." },
        { order: 4, title: "Document", description: "Record what changed and how to operate it." },
      ],
      permissions: { filesystem: "read-write", network: "outbound-only", shell: "restricted", sensitiveDataAccess: false },
      allowedTools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash"],
      model: "opus",
      communicationProtocol: {
        inputFormat: "A pipeline or infrastructure change request with target environment.",
        outputFormat: "A diff of pipeline/IaC files plus a short runbook note.",
        escalationPath: "Ask an SRE or platform owner before any change that touches production.",
        collaboratesWith: ["engineering-lead"],
      },
      executionConstraints: {
        autonomyLevel: "supervised",
        requiresHumanApproval: true,
        maxSteps: 40,
        timeoutMinutes: 30,
        forbiddenActions: [
          "deploy directly to production without a verified staging run",
          "store secrets in plain text",
        ],
      },
      reportingFormat: {
        style: "milestone-summary",
        sections: ["Summary", "Files Changed", "Pipeline Run", "Rollback Notes"],
        frequency: "after each milestone",
      },
      successCriteria: [
        "Pipeline succeeds against the target environment",
        "Change is reproducible from the recorded artifacts",
        "Rollback path is documented",
      ],
      failureBehavior: {
        onBlocker: "Report which step failed and the last successful state.",
        onAmbiguity: "Pause and confirm intent with the platform owner.",
        escalateTo: "platform owner",
        rollbackStrategy: "Revert pipeline/IaC changes to the last known-good revision.",
      },
    }),
};
