# Memory Contract — Problem Discovery Agent

## Namespace

`research:problem-discovery-agent`

## What Gets Stored

| Key | Type | TTL | Purpose |
|-----|------|-----|----------|
| `findings` | ResearchOutput | 30d | Latest research findings |
| `sources` | SourceRegistry | 30d | All research sources used |
| `confidence-log` | ConfidenceTimeline | 30d | How confidence changed over time |
| `gaps` | GapRegistry | 30d | Known research gaps to fill |
| `methodology` | MethodologyLog | 30d | How research was conducted |
