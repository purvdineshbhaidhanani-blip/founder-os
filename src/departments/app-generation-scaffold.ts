import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentSpec } from "./types.js";

const ROOT = "/home/user/founder-os";

/**
 * Writes the per-agent folder structure for an App Generation agent, mirroring
 * the Foundation/Product-Discovery scaffold contract: README, SYSTEM_PROMPT,
 * INPUT_SCHEMA, OUTPUT_SCHEMA, WORKFLOW, MEMORY, CHECKLIST, VALIDATION, CONFIG.
 */
export async function scaffoldAppGenerationAgent(spec: AgentSpec): Promise<void> {
  const dir = join(ROOT, "agents", spec.name);
  await mkdir(dir, { recursive: true });

  const responsibilities = spec.responsibilities.map((r) => `- ${r}`).join("\n");
  const objectives = spec.objectives.map((o) => `- ${o}`).join("\n");
  const sendsTo = spec.sendsTo.join(", ") || "founder";
  const receivesFrom = spec.receivesFrom.join(", ") || "founder";

  await writeFile(
    join(dir, "README.md"),
    `# ${spec.displayName}\n\n${spec.summary}\n\n## Role\n\n${spec.role}\n\n## Responsibilities\n\n${responsibilities}\n\n## Objectives\n\n${objectives}\n\n## I/O Contract\n\n**Receives from:** ${receivesFrom}\n\n**Sends to:** ${sendsTo}\n\n**Reports to:** ${spec.reportsTo}\n`,
  );

  await writeFile(
    join(dir, "SYSTEM_PROMPT.md"),
    `# System Prompt — ${spec.displayName}\n\nYou are the **${spec.displayName}** agent in the App Generation Department.\n\n## Role\n\n${spec.role}\n\n## Responsibilities\n\n${responsibilities}\n\n## Objectives\n\n${objectives}\n\n## Collaboration\n\nYou receive work from: ${receivesFrom}\n\nYou deliver results to: ${sendsTo}\n\nYou escalate to: ${spec.reportsTo}\n\n## Operating Principles\n\n- Every decision traces back to a specific upstream artifact (Product Discovery Package finding or upstream architecture spec), never to assumption.\n- Never expand scope beyond the MVP scope carried in the Product Discovery Package.\n- Structured outputs (JSON) for downstream agent consumption; never hand off free-form prose as the sole artifact.\n- On ambiguity or missing upstream data, escalate rather than guess.\n- Never fabricate secrets, credentials, or production endpoints — document requirements, don't invent values.\n`,
  );

  await writeFile(
    join(dir, "INPUT_SCHEMA.json"),
    JSON.stringify(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: `${spec.displayName} Input`,
        type: "object",
        required: ["upstreamArtifacts", "context"],
        properties: {
          upstreamArtifacts: {
            type: "array",
            description: "Artifact IDs/content this agent consumes (Product Discovery Package or upstream architecture specs).",
            items: { type: "object", additionalProperties: true },
          },
          context: { type: "object", description: "Structured context from upstream agents.", additionalProperties: true },
          constraints: {
            type: "object",
            description: "Timeline, budget, platform, and compliance constraints carried from discovery.",
            properties: {
              timelineWeeks: { type: "number" },
              budget: { type: "string" },
              platforms: { type: "array", items: { type: "string" } },
              complianceRequirements: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(dir, "OUTPUT_SCHEMA.json"),
    JSON.stringify(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: `${spec.displayName} Output`,
        type: "object",
        required: ["deliverable", "confidence", "qualityScore", "traceability"],
        properties: {
          deliverable: { type: "object", description: "The structured artifact this agent produces (spec, code manifest, test report, etc.).", additionalProperties: true },
          confidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence the deliverable correctly satisfies upstream requirements." },
          qualityScore: { type: "number", minimum: 0, maximum: 1, description: "Self-assessed quality against this agent's VALIDATION.md criteria." },
          traceability: {
            type: "array",
            description: "Explicit links from each decision to the upstream artifact/finding that justified it.",
            items: { type: "object", properties: { decision: { type: "string" }, source: { type: "string" } } },
          },
          gaps: { type: "array", items: { type: "string" } },
          nextSteps: { type: "array", items: { type: "string" } },
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(dir, "WORKFLOW.md"),
    `# Workflow — ${spec.displayName}\n\n## Execution Steps\n\n1. **Receive** — Accept upstream artifacts from ${receivesFrom} via the Task Queue.\n2. **Validate Input** — Confirm upstream artifacts are complete; escalate to ${spec.reportsTo} on missing/ambiguous data.\n3. **Design/Implement** — Carry out this agent's responsibilities against the MVP scope only.\n4. **Self-Score** — Assign confidence and qualityScore against this agent's VALIDATION.md criteria.\n5. **Publish Artifacts** — Register outputs via the Artifact Manager with explicit traceability entries.\n6. **Hand Off** — Deliver structured output to ${sendsTo}; announce via the Event Bus.\n7. **Memory Update** — Record outcome in this agent's namespace in shared memory.\n\n## Failure Handling\n\n- Missing/ambiguous upstream input: escalate to ${spec.reportsTo}, do not guess.\n- Failed self-validation: retry once against corrected input, then escalate.\n- Scope creep detected (feature not in MVP scope): flag and defer, do not silently implement.\n`,
  );

  await writeFile(
    join(dir, "MEMORY.md"),
    `# Memory Contract — ${spec.displayName}\n\n## Namespace\n\n\`app-generation:${spec.name}\`\n\n## What Gets Stored\n\n| Key | Type | TTL | Purpose |\n|-----|------|-----|----------|\n| \`deliverable\` | StructuredArtifact | 90d | Latest produced spec/code/test/deployment artifact |\n| \`traceability-log\` | TraceabilityEntry[] | 90d | Decision-to-upstream-source links |\n| \`confidence-log\` | ConfidenceTimeline | 90d | How confidence/qualityScore changed across revisions |\n| \`escalations\` | EscalationRecord[] | 90d | Ambiguities/gaps escalated upstream |\n`,
  );

  await writeFile(
    join(dir, "CHECKLIST.md"),
    `# Checklist — ${spec.displayName}\n\n## Pre-Work\n\n- [ ] Upstream artifacts from ${receivesFrom} received and complete\n- [ ] MVP scope boundary confirmed (no speculative scope expansion)\n- [ ] Constraints (timeline/budget/platforms/compliance) loaded\n\n## During Work\n\n- [ ] Every decision traced to a specific upstream finding\n- [ ] Ambiguities escalated to ${spec.reportsTo}, not guessed\n- [ ] No secrets/credentials fabricated or hardcoded\n\n## Before Output\n\n- [ ] Deliverable validates against OUTPUT_SCHEMA\n- [ ] confidence and qualityScore reflect actual evidence, not optimism\n- [ ] Traceability entries present for every non-trivial decision\n- [ ] Structured JSON ready for ${sendsTo} to consume\n`,
  );

  await writeFile(
    join(dir, "VALIDATION.md"),
    `# Validation &amp; Acceptance Criteria — ${spec.displayName}\n\n## Agent Structural Validation\n\n- Blueprint passes \`validateBlueprint()\` with zero errors\n- Generated agent file passes \`validateGeneratedAgent()\` with zero blocking issues\n- Agent registered in \`registry/agents.registry.json\` with status \`active\`\n\n## Behavioural Acceptance Criteria\n\n${spec.objectives.map((o, i) => `${i + 1}. **${o}**`).join("\n")}\n\n## Quality Gates\n\n- Deliverable traces every decision to an upstream artifact\n- No MVP-scope violations (features beyond Product Discovery Package MVP scope)\n- Integration test confirms message round-trip: ${receivesFrom} → ${spec.name} → ${sendsTo}\n- Memory read/write round-trip confirmed in agent namespace\n`,
  );

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
          maxCostCentsPerTask: 200,
          maxDurationMs: 240000,
        },
        memory: {
          namespace: `app-generation:${spec.name}`,
          ttlDefaults: { deliverable: "90d", traceabilityLog: "90d", confidenceLog: "90d" },
        },
        retry: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
        validation: { minConfidenceThreshold: 0.6, requireTraceability: true },
        approval: { requireHumanFor: ["deployment-to-production", "secrets-provisioning", "payments-go-live"] },
        tags: spec.tags ?? [],
      },
      null,
      2,
    ),
  );
}

export async function scaffoldAppGenerationDepartment(specs: AgentSpec[]): Promise<{ name: string; path: string }[]> {
  const results: { name: string; path: string }[] = [];
  for (const spec of specs) {
    await scaffoldAppGenerationAgent(spec);
    results.push({ name: spec.name, path: `agents/${spec.name}` });
  }
  return results;
}
