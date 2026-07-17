# Founder OS v1.0 — Production Checklist

## Engineering foundation (Loops 1-4)
- [x] Runtime Foundation (Agent Runtime, Registry, LLM Adapter, Orchestrator, Memory) — Loop 1
- [x] Agent Execution (Agent Loader, Prompt Builder, real Ollama execution, structured results) — Loop 2
- [x] Tool Execution (Registry, Executor, file/shell/git/http/search tools, permissions, sandboxing) — Loop 3
- [x] Production Configuration (typed, validated, safe-defaults env config) — Loop 4
- [x] Provider/Model mapping (configurable aliases, no hardcoding, execution engine unchanged) — Loop 4
- [x] Production CLI (`founder doctor/run/agent/tools/models/config/version`) — Loop 4
- [x] Startup diagnostics — Loop 4
- [x] Centralized structured logging (pre-existing, reused) — Loop 4
- [x] Execution metrics/observability (event-driven, zero core changes) — Loop 4
- [x] Structured errors across every subsystem (`LlmError`, `ToolResult.error`, CLI `failWithMessage`) — Loops 2-4
- [x] Install scripts (Linux/macOS/Windows) — Loop 4
- [x] Docker + docker-compose — Loop 4
- [x] Documentation (architecture, CLI, config, tools, memory, LLM adapter, install, this checklist) — Loop 4

## Before you rely on this in day-to-day use
- [ ] Run `founder doctor` on your actual machine and resolve anything it flags.
- [ ] Install Ollama and pull at least one model (`ollama pull llama3.1`).
- [ ] Round-trip at least one real agent execution against your live Ollama daemon
      (this repo's sandbox could not reach a real Ollama daemon — see
      docs/AI_PIPELINE.md's honesty note and the validation turn before Loop 4).
- [ ] Decide your `FOUNDER_MODEL_ALIASES` if you plan to run agents whose
      frontmatter `model:` hints (opus/sonnet/haiku) you want mapped to
      specific local models.
- [ ] Review `docs/TOOL_EXECUTION.md`'s security model and decide your
      default posture for `--tools`/`--no-interactive` before automating runs.

## Known, honestly-scoped limitations (not fixed in this loop, by design)
- No OS-level jail for shell tools beyond sandboxed `cwd` + the permission gate.
- `zodToJsonSchema` covers only this repo's own tool schemas, not full Zod.
- SSRF-rejected HTTP requests still retry per normal policy (wasteful, not unsafe).
- Live Ollama wire-format compatibility is implemented against Ollama's
  documented API and unit/integration-tested against a stub — never
  round-tripped against a real daemon inside this sandbox (no daemon
  reachable here). Verify once on your own machine before relying on it.
- No coverage tooling configured (`vitest --coverage` not wired up) — test
  counts are reported, coverage percentages are not.

## Everything below is normal software maintenance, not a new architecture loop
- Bug fixes.
- New tools (add a `ToolDefinition`, list it in `BUILT_IN_TOOLS`).
- New LLM providers (implement `LlmProvider`, register with `LlmClient`).
- New CLI commands (add a `Command`, register it in `buildFounderCli()`).
- Versioned releases (v1.0.1, v1.1, v2.0).
