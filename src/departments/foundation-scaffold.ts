import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentSpec } from "./types.js";

const ROOT = "/home/user/founder-os";

/**
 * Writes the per-agent folder structure for a Foundation Layer agent:
 *   agents/<name>/
 *     README.md          — purpose, role, I/O contract
 *     SYSTEM_PROMPT.md   — the agent's system prompt (mirrors .claude/agents/<name>.md body)
 *     INPUT_SCHEMA.json  — structured input contract
 *     OUTPUT_SCHEMA.json — structured output contract
 *     WORKFLOW.md        — step-by-step execution flow
 *     MEMORY.md          — what is stored and why
 *     CHECKLIST.md       — pre-flight and post-flight checks
 *     VALIDATION.md      — acceptance criteria and quality gates
 *     CONFIG.json        — runtime configuration defaults
 */
export async function scaffoldFoundationAgent(spec: AgentSpec): Promise<void> {
  const dir = join(ROOT, "agents", spec.name);
  await mkdir(dir, { recursive: true });

  const responsibilities = spec.responsibilities.map((r) => `- ${r}`).join("\n");
  const objectives = spec.objectives.map((o) => `- ${o}`).join("\n");
  const sendsTo = spec.sendsTo.join(", ") || "orchestrator-agent";
  const receivesFrom = spec.receivesFrom.join(", ") || "orchestrator-agent";

  // README.md
  await writeFile(
    join(dir, "README.md"),
    `# ${spec.displayName}\n\n${spec.summary}\n\n## Role\n\n${spec.role}\n\n## Responsibilities\n\n${responsibilities}\n\n## Objectives\n\n${objectives}\n\n## I/O Contract\n\n**Receives from:** ${receivesFrom}\n\n**Sends to:** ${sendsTo}\n\n**Reports to:** ${spec.reportsTo}\n`,
  );

  // SYSTEM_PROMPT.md
  await writeFile(
    join(dir, "SYSTEM_PROMPT.md"),
    `# System Prompt — ${spec.displayName}\n\nYou are the **${spec.displayName}** agent in the AI Founder OS.\n\n## Role\n\n${spec.role}\n\n## Responsibilities\n\n${responsibilities}\n\n## Objectives\n\n${objectives}\n\n## Collaboration\n\nYou receive work from: ${receivesFrom}\n\nYou deliver results to: ${sendsTo}\n\nYou escalate to: ${spec.reportsTo}\n\n## Operating Principles\n\n- Always verify inputs against the INPUT_SCHEMA before processing.\n- Publish results through the Artifact Manager and announce on the Event Bus.\n- On failure, emit a structured failure event and escalate to ${spec.reportsTo}.\n- Never modify another agent's namespace in shared memory without an explicit handoff record.\n`,
  );

  // INPUT_SCHEMA.json
  await writeFile(
    join(dir, "INPUT_SCHEMA.json"),
    JSON.stringify(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: `${spec.displayName} Input`,
        description: `Input contract for the ${spec.displayName} agent.`,
        type: "object",
        required: ["taskId", "goal"],
        properties: {
          taskId: { type: "string", description: "Unique identifier for this task instance." },
          goal: { type: "string", description: "Natural-language description of what this task should achieve." },
          context: { type: "object", description: "Structured context loaded by the Context Manager.", additionalProperties: true },
          priority: { type: "string", enum: ["low", "medium", "high", "critical"], default: "medium" },
          deadline: { type: "string", format: "date-time", description: "ISO-8601 deadline, if any." },
        },
      },
      null,
      2,
    ),
  );

  // OUTPUT_SCHEMA.json
  await writeFile(
    join(dir, "OUTPUT_SCHEMA.json"),
    JSON.stringify(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: `${spec.displayName} Output`,
        description: `Output contract for the ${spec.displayName} agent.`,
        type: "object",
        required: ["taskId", "status", "result"],
        properties: {
          taskId: { type: "string" },
          status: { type: "string", enum: ["succeeded", "failed", "escalated"] },
          result: { type: "object", description: "Task-specific result payload.", additionalProperties: true },
          artifactIds: { type: "array", items: { type: "string" }, description: "IDs of artifacts published to the Artifact Manager." },
          nextSteps: { type: "array", items: { type: "string" }, description: "Recommended follow-on tasks." },
          errors: { type: "array", items: { type: "string" }, description: "Structured errors, if status is failed." },
        },
      },
      null,
      2,
    ),
  );

  // WORKFLOW.md
  await writeFile(
    join(dir, "WORKFLOW.md"),
    `# Workflow — ${spec.displayName}\n\n## Execution Steps\n\n1. **Receive** — Accept task from ${receivesFrom} via the Master Orchestrator's Task Queue.\n2. **Load Context** — Request context load from the Context Manager for this task's namespace.\n3. **Validate Input** — Assert input against INPUT_SCHEMA; escalate to ${spec.reportsTo} on schema failure.\n4. **Execute** — Carry out the responsibilities listed in README.md, step by step.\n5. **Publish Artifacts** — Register all output artifacts via the Artifact Manager.\n6. **Announce** — Emit a task.completed event on the Event Bus with the artifact IDs.\n7. **Hand Off** — Notify ${sendsTo} via the Communication Bus that results are ready.\n8. **Memory Update** — Write task outcome and key results to the agent namespace in shared memory.\n\n## Failure Handling\n\n- On any step 3–8 failure, emit task.failed with a structured error payload.\n- The Master Orchestrator's retry policy applies (max 3 retries with exponential backoff).\n- After 3 failures, escalate to ${spec.reportsTo} via the Approval System.\n`,
  );

  // MEMORY.md
  await writeFile(
    join(dir, "MEMORY.md"),
    `# Memory Contract — ${spec.displayName}\n\n## Namespace\n\n\`agent:${spec.name}\`\n\n## What Is Stored\n\n| Key | Type | TTL | Description |\n|-----|------|-----|-------------|\n| \`last-task\` | TaskRecord | 24h | The most recent task processed, with input, output and duration. |\n| \`metrics\` | MetricSeries | 7d | Rolling performance metrics: success rate, latency, error rate. |\n| \`context-cache\` | ContextBundle | 1h | Cached context for repeat requests within the same session. |\n\n## What Is NOT Stored\n\n- Raw user input (stored in conversation namespace by Context Manager)\n- Secrets or credentials (owned by Configuration Manager / Founder Vault)\n- Cross-agent state (use Artifact Manager + Event Bus for handoffs)\n`,
  );

  // CHECKLIST.md
  await writeFile(
    join(dir, "CHECKLIST.md"),
    `# Checklist — ${spec.displayName}\n\n## Pre-Flight (before execution)\n\n- [ ] Task input validates against INPUT_SCHEMA\n- [ ] Context loaded from Context Manager for this namespace\n- [ ] Dependencies (${receivesFrom}) have confirmed their outputs are ready\n- [ ] No conflicting task from another agent holds a lock on required artifacts\n\n## Post-Flight (after execution)\n\n- [ ] Output validates against OUTPUT_SCHEMA\n- [ ] All artifacts registered in Artifact Manager with correct version tags\n- [ ] task.completed event emitted on Event Bus\n- [ ] Downstream agents (${sendsTo}) notified via Communication Bus\n- [ ] Task outcome written to \`agent:${spec.name}:last-task\` in shared memory\n- [ ] Metrics updated in \`agent:${spec.name}:metrics\`\n`,
  );

  // VALIDATION.md
  await writeFile(
    join(dir, "VALIDATION.md"),
    `# Validation & Acceptance Criteria — ${spec.displayName}\n\n## Agent Structural Validation\n\n- Blueprint passes \`validateBlueprint()\` with zero errors\n- Generated agent file passes \`validateGeneratedAgent()\` with zero blocking issues\n- Agent registered in \`registry/agents.registry.json\` with status \`active\`\n\n## Behavioural Acceptance Criteria\n\n${spec.objectives.map((o, i) => `${i + 1}. **${o}**`).join("\n")}\n\n## Quality Gates\n\n- Validation suite for this agent runs without failures\n- Integration test confirms message round-trip: ${receivesFrom} → ${spec.name} → ${sendsTo}\n- Memory read/write round-trip confirmed in agent namespace\n- No duplicate agents with overlapping responsibilities detected by the validator\n`,
  );

  // CONFIG.json
  await writeFile(
    join(dir, "CONFIG.json"),
    JSON.stringify(
      {
        name: spec.name,
        displayName: spec.displayName,
        category: spec.category,
        department: spec.department,
        status: "active",
        modelRouting: {
          preferredTier: "high",
          fallbackTier: "medium",
          maxCostCentsPerTask: 50,
          maxDurationMs: 120000,
        },
        memory: {
          namespace: `agent:${spec.name}`,
          ttlDefaults: {
            workingMemory: "1h",
            taskRecord: "24h",
            metrics: "7d",
          },
        },
        retry: {
          maxAttempts: 3,
          backoffMs: 1000,
          backoffMultiplier: 2,
        },
        approval: {
          requireHumanFor: ["destructive-action", "external-publish", "config-change"],
        },
        tags: spec.tags ?? [],
      },
      null,
      2,
    ),
  );
}

/**
 * Scaffolds per-agent folders for the entire department and returns a
 * summary of what was written.
 */
export async function scaffoldFoundationDepartment(specs: AgentSpec[]): Promise<{ name: string; path: string }[]> {
  const results: { name: string; path: string }[] = [];
  for (const spec of specs) {
    await scaffoldFoundationAgent(spec);
    results.push({ name: spec.name, path: `agents/${spec.name}` });
  }
  return results;
}
