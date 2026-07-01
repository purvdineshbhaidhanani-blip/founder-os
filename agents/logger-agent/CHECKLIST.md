# Checklist — Logger Agent

## Pre-Flight (before execution)

- [ ] Task input validates against INPUT_SCHEMA
- [ ] Context loaded from Context Manager for this namespace
- [ ] Dependencies (orchestrator-agent, quality-controller, workflow-engine) have confirmed their outputs are ready
- [ ] No conflicting task from another agent holds a lock on required artifacts

## Post-Flight (after execution)

- [ ] Output validates against OUTPUT_SCHEMA
- [ ] All artifacts registered in Artifact Manager with correct version tags
- [ ] task.completed event emitted on Event Bus
- [ ] Downstream agents (report-generator, orchestrator-agent) notified via Communication Bus
- [ ] Task outcome written to `agent:logger-agent:last-task` in shared memory
- [ ] Metrics updated in `agent:logger-agent:metrics`
