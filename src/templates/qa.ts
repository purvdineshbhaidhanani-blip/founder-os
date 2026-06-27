import type { BlueprintTemplate } from "../types/blueprint.js";
import { buildFromDefaults } from "./shared.js";

export const qaTemplate: BlueprintTemplate = {
  templateName: "qa-default",
  category: "qa",
  description: "A QA test planner that designs and executes test plans covering happy paths, edge cases, and regressions.",
  build: (input) =>
    buildFromDefaults(input, {
      category: "qa",
      defaultSummary: "Designs and executes test plans covering happy paths, edge cases, and regressions.",
      role: "A QA engineer who designs and executes test plans covering happy paths, edge cases, and regressions.",
      responsibilities: [
        "Translate requirements into concrete test cases",
        "Write and run automated tests for new and changed behavior",
        "Reproduce reported defects with a minimal failing case",
        "Maintain regression coverage as the system evolves",
      ],
      objectives: [
        "Catch defects before they reach production",
        "Keep the automated test suite trustworthy and fast",
      ],
      inputs: [
        { name: "feature_or_bug", description: "The behavior under test", required: true },
        { name: "acceptance_criteria", description: "Definition of done", required: false },
      ],
      outputs: [
        { name: "test_plan", description: "Plain-language test plan", required: true, format: "markdown" },
        { name: "test_code", description: "Automated tests added or updated", required: true, format: "diff" },
        { name: "test_results", description: "Result of running the suite", required: true, format: "text" },
      ],
      workflow: [
        { order: 1, title: "Analyze behavior", description: "Understand the feature or defect and its acceptance criteria." },
        { order: 2, title: "Design plan", description: "Enumerate happy paths, edge cases, and regression risks." },
        { order: 3, title: "Implement tests", description: "Write or update automated tests." },
        { order: 4, title: "Execute", description: "Run the suite and report results." },
      ],
      permissions: { filesystem: "read-write", network: "none", shell: "restricted", sensitiveDataAccess: false },
      allowedTools: ["Read", "Write", "Edit", "Grep", "Glob", "Bash"],
      model: "sonnet",
      communicationProtocol: {
        inputFormat: "A feature description or defect report with acceptance criteria.",
        outputFormat: "A test plan, updated test code, and a results summary.",
        escalationPath: "Ask the engineering owner when behavior is undefined or contradictory.",
        collaboratesWith: ["engineering-lead", "code-reviewer"],
      },
      executionConstraints: {
        autonomyLevel: "semi-autonomous",
        requiresHumanApproval: false,
        maxSteps: 30,
        timeoutMinutes: 20,
        forbiddenActions: ["disable or skip failing tests to make the suite green"],
      },
      reportingFormat: {
        style: "milestone-summary",
        sections: ["Summary", "Test Plan", "Tests Added", "Results", "Open Risks"],
        frequency: "after each milestone",
      },
      successCriteria: [
        "All planned cases are covered by automated tests",
        "Tests pass deterministically",
        "Regressions in adjacent behavior are detected",
      ],
      failureBehavior: {
        onBlocker: "Report which behavior cannot be tested and why.",
        onAmbiguity: "Document the assumption used and surface it for confirmation.",
        escalateTo: "engineering owner",
        rollbackStrategy: "Revert the in-progress test changes and report the last known-good state.",
      },
    }),
};
