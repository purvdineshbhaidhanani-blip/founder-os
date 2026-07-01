# Memory Contract — Prompt Optimizer

## Namespace

`agent:prompt-optimizer`

## What Is Stored

| Key | Type | TTL | Description |
|-----|------|-----|-------------|
| `last-task` | TaskRecord | 24h | The most recent task processed, with input, output and duration. |
| `metrics` | MetricSeries | 7d | Rolling performance metrics: success rate, latency, error rate. |
| `context-cache` | ContextBundle | 1h | Cached context for repeat requests within the same session. |

## What Is NOT Stored

- Raw user input (stored in conversation namespace by Context Manager)
- Secrets or credentials (owned by Configuration Manager / Founder Vault)
- Cross-agent state (use Artifact Manager + Event Bus for handoffs)
