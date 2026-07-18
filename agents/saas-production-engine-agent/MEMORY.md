# Memory Contract — SaaS Production Engine Agent

## Namespace

`app-generation:saas-production-engine-agent`

## What Gets Stored

| Key | Type | TTL | Purpose |
|-----|------|-----|----------|
| `deliverable` | StructuredArtifact | 90d | Latest produced spec/code/test/deployment artifact |
| `traceability-log` | TraceabilityEntry[] | 90d | Decision-to-upstream-source links |
| `confidence-log` | ConfidenceTimeline | 90d | How confidence/qualityScore changed across revisions |
| `escalations` | EscalationRecord[] | 90d | Ambiguities/gaps escalated upstream |
