import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentSpec } from "./types.js";

const ROOT = "/home/user/founder-os";

export async function scaffoldProductDiscoveryAgent(spec: AgentSpec): Promise<void> {
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
    `# System Prompt — ${spec.displayName}\n\nYou are the **${spec.displayName}** agent in the Product Discovery & Research Department.\n\n## Role\n\n${spec.role}\n\n## Responsibilities\n\n${responsibilities}\n\n## Objectives\n\n${objectives}\n\n## Collaboration\n\nYou receive work from: ${receivesFrom}\n\nYou deliver results to: ${sendsTo}\n\nYou escalate to: ${spec.reportsTo}\n\n## Operating Principles\n\n- All outputs must be backed by research evidence, not assumptions.\n- Flag uncertainty with confidence scores and caveats.\n- Every finding must cite its source.\n- Structured outputs (JSON/YAML) for downstream agent consumption.\n- On discovery of contradictions, escalate rather than guess.\n`,
  );

  await writeFile(
    join(dir, "INPUT_SCHEMA.json"),
    JSON.stringify(
      {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        title: `${spec.displayName} Input`,
        type: "object",
        required: ["researchQuery", "context"],
        properties: {
          researchQuery: { type: "string", description: "What question must be researched?" },
          context: {
            type: "object",
            description: "Prior research context from upstream agents.",
            additionalProperties: true,
          },
          constraints: {
            type: "object",
            description: "Timeline, budget, scope constraints.",
            properties: { timelineWeeks: { type: "number" }, budget: { type: "string" }, scope: { type: "array" } },
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
        required: ["findings", "confidence", "sources"],
        properties: {
          findings: {
            type: "object",
            description: "Research findings (structured per agent type).",
            additionalProperties: true,
          },
          confidence: { type: "number", minimum: 0, maximum: 1, description: "Confidence in findings (0-1)." },
          sources: {
            type: "array",
            description: "Evidence sources backing each finding.",
            items: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["interview", "survey", "report", "public-data", "benchmark"] },
                description: { type: "string" },
                credibility: { type: "number", minimum: 0, maximum: 1 },
              },
            },
          },
          gaps: { type: "array", items: { type: "string" }, description: "Research gaps identified." },
          nextSteps: { type: "array", items: { type: "string" } },
        },
      },
      null,
      2,
    ),
  );

  await writeFile(
    join(dir, "WORKFLOW.md"),
    `# Workflow — ${spec.displayName}\n\n## Research Pipeline\n\n1. **Receive** — Accept research query from ${receivesFrom}.\n2. **Clarify** — Validate query and constraints; request clarification if ambiguous.\n3. **Research** — Execute research methodology appropriate to the question.\n4. **Synthesize** — Integrate findings with prior context from upstream agents.\n5. **Score** — Assign confidence scores and identify gaps.\n6. **Output** — Produce structured JSON output with sources.\n7. **Hand Off** — Send output to ${sendsTo}; no silent failures.\n\n## Failure Modes\n\n- Insufficient evidence: Report confidence < 0.6; flag as gap\n- Contradictory findings: Escalate to ${spec.reportsTo}; don't guess\n- Missing data: Request additional research time or note limitation\n`,
  );

  await writeFile(
    join(dir, "MEMORY.md"),
    `# Memory Contract — ${spec.displayName}\n\n## Namespace\n\n\`research:${spec.name}\`\n\n## What Gets Stored\n\n| Key | Type | TTL | Purpose |\n|-----|------|-----|----------|\n| \`findings\` | ResearchOutput | 30d | Latest research findings |\n| \`sources\` | SourceRegistry | 30d | All research sources used |\n| \`confidence-log\` | ConfidenceTimeline | 30d | How confidence changed over time |\n| \`gaps\` | GapRegistry | 30d | Known research gaps to fill |\n| \`methodology\` | MethodologyLog | 30d | How research was conducted |\n`,
  );

  await writeFile(
    join(dir, "CHECKLIST.md"),
    `# Checklist — ${spec.displayName}\n\n## Pre-Research\n\n- [ ] Research query is clear and specific\n- [ ] Context from ${receivesFrom} is complete\n- [ ] Resources available within timeline and budget\n- [ ] Methodology matches question type\n\n## During Research\n\n- [ ] Evidence is documented with source attribution\n- [ ] Contradictions are noted, not resolved by guess\n- [ ] Confidence scores calibrated to evidence quality\n- [ ] Research gaps identified as discovered\n\n## Before Output\n\n- [ ] Findings validate against INPUT_SCHEMA\n- [ ] Output validates against OUTPUT_SCHEMA\n- [ ] All findings traced to specific sources\n- [ ] Gaps flagged for downstream agents to address\n- [ ] Structured JSON ready for agent consumption\n`,
  );

  await writeFile(
    join(dir, "VALIDATION.md"),
    `# Validation & Acceptance Criteria — ${spec.displayName}\n\n## Output Requirements\n\n- All findings backed by credible sources\n- Confidence scores reflect evidence quality (not optimism)\n- Contradictions flagged, not hidden\n- Gaps explicitly documented\n- Structured outputs parse as valid JSON\n\n## Quality Gates\n\n- Blueprint passes validateBlueprint() ✓\n- Generated agent passes validateGeneratedAgent() ✓\n- Agent registered in registry with status active ✓\n- Integration test: ${receivesFrom} → ${spec.name} → ${sendsTo} ✓\n- Memory read/write tests passing ✓\n`,
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
        researchCapabilities: ["interviews", "surveys", "desk-research", "data-analysis", "synthesis"],
        modelRouting: {
          preferredTier: "high",
          fallbackTier: "medium",
          maxCostCentsPerTask: 150,
          maxDurationMs: 180000,
        },
        memory: {
          namespace: `research:${spec.name}`,
          ttlDefaults: { findings: "30d", sources: "30d", gaps: "30d" },
        },
        validation: {
          minConfidenceThreshold: 0.6,
          requireSourceAttribution: true,
          requireGapDocumentation: true,
        },
        tags: spec.tags ?? [],
      },
      null,
      2,
    ),
  );
}

export async function scaffoldProductDiscoveryDepartment(specs: AgentSpec[]): Promise<{ name: string; path: string }[]> {
  const results: { name: string; path: string }[] = [];
  for (const spec of specs) {
    await scaffoldProductDiscoveryAgent(spec);
    results.push({ name: spec.name, path: `agents/${spec.name}` });
  }
  return results;
}
