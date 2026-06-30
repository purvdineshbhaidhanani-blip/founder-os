# Founder OS — Complete Setup Guide

## Platform-Specific Guides

- **Windows**: See [SETUP-WINDOWS.md](SETUP-WINDOWS.md)
- **macOS/Linux**: See below

---

## macOS / Linux Setup

### 1. Clone & Install
```bash
git clone <repo-url>
cd founder-os
npm install
```

### 2. Build
```bash
npm run build
```

### 3. Run Research
```bash
node dist/cli/index.js research run --period 30d --skip-cred-check
```

### 4. View Results
```bash
node dist/cli/index.js research dashboard
node dist/cli/index.js research report
```

### Credentials (Optional)
```bash
export GITHUB_TOKEN=your_token_here
export YOUTUBE_API_KEY=your_key_here
export STACKEXCHANGE_API_KEY=your_key_here
```

Or create `.env.local`:
```
GITHUB_TOKEN=your_token_here
YOUTUBE_API_KEY=your_key_here
STACKEXCHANGE_API_KEY=your_key_here
```

---

## Quick Command Reference

| Task | Command |
|------|---------|
| Install | `npm install` |
| Build | `npm run build` |
| Test | `npm run test` |
| Run research (30d) | `node dist/cli/index.js research run --period 30d` |
| View dashboard | `node dist/cli/index.js research dashboard` |
| View report | `node dist/cli/index.js research report` |
| List sessions | `node dist/cli/index.js research history` |
| Search | `node dist/cli/index.js research search <keyword>` |
| Compare sessions | `node dist/cli/index.js research compare <id1> <id2>` |
| Export report | `node dist/cli/index.js research export <id> --format md` |

---

## Verify Installation

### Typecheck
```bash
npm run typecheck
```
Expected: No errors

### Test Suite
```bash
npm run test
```
Expected: 370 tests passed

### CLI Works
```bash
node dist/cli/index.js research --help
```
Expected: Help output with all commands

---

## Project Structure

```
founder-os/
├── src/
│   ├── opportunity/
│   │   ├── research/           # Research engine
│   │   ├── intelligence/       # Scoring engines
│   │   ├── decision/           # Decision Court
│   │   ├── blueprint/          # Business blueprint
│   │   └── runtime/            # Autonomous runtime
│   ├── cli/                    # CLI commands
│   └── utils/
├── tests/
├── dist/                       # Built files (created by npm run build)
└── .founder-os/               # Data storage (created by research run)
    ├── research/              # Session data
    ├── exports/               # Exported reports
    ├── checkpoints/           # Resume points
    ├── config.json            # Settings
    ├── connector-health.json  # API stats
    └── opportunity-history.json # Score history
```

---

## What Gets Built

- **Opportunity Collector**: 6 sources (GitHub, YouTube, StackExchange, HackerNews, RSS, Forums)
- **Research Engine**: Parallel collection, deduplication, signal extraction
- **Intelligence Layer**: 10-engine scoring (noise, trust, freshness, market, AI-readiness, etc.)
- **Decision Court**: 14 reviewers + Devil's Advocate + consensus
- **Business Blueprint**: 18 engines (pricing, revenue, costs, tech, risks, ROI, recommendations)
- **Dashboard**: Champion tracking, history, statistics
- **CLI**: 11 research subcommands

---

## Features

✅ Real-time research execution  
✅ Parallel API collection  
✅ Automatic deduplication (URL + content fingerprint + word similarity)  
✅ Signal extraction & clustering  
✅ Intelligence scoring (10 engines)  
✅ Decision Court analysis (14 reviewers)  
✅ Business blueprint generation (18 engines)  
✅ Persistent session storage  
✅ Connector health tracking  
✅ Opportunity history tracking  
✅ Session comparison & diff  
✅ Report export (Markdown + JSON)  
✅ Search & filtering  
✅ Resume failed research  
✅ Configuration persistence  

---

## Example Workflow

```bash
# 1. Run research (collect from HackerNews only - no API keys needed)
node dist/cli/index.js research run --period 30d --sources hacker-news --skip-cred-check

# 2. View what was found
node dist/cli/index.js research dashboard

# 3. See the top opportunity
node dist/cli/index.js research report

# 4. Export the report as Markdown
node dist/cli/index.js research export <sessionId> --format md

# 5. Compare with a previous session
node dist/cli/index.js research compare <oldSessionId> <newSessionId>

# 6. Search for specific topics
node dist/cli/index.js research search "automation"

# 7. Monitor connector health
node dist/cli/index.js research health
```

---

## Troubleshooting

**Build fails**: `rm -rf dist && npm run build`

**Tests fail**: `npm install && npm run build && npm run test`

**CLI not found**: Verify `dist/cli/index.js` exists. If not, run `npm run build`.

**Research returns empty**: Add `--skip-cred-check` or set credentials in `.env.local`

**Data not persisting**: Verify `.founder-os/` directory exists (created automatically on first run)

---

## Performance

- **Single research run**: 5–30 seconds (depends on sources and network)
- **Analysis (intelligence + blueprint)**: 1–3 seconds per opportunity
- **Dashboard load**: Instant (from disk cache)
- **Search**: <100ms across all sessions
- **Full test suite**: ~5 seconds

---

## Memory Usage

- Idle: <50 MB
- During collection: 200–500 MB (depends on items collected)
- After analysis: 100–300 MB (opportunity data in memory)

---

## Next Steps

1. Install dependencies: `npm install`
2. Build project: `npm run build`
3. Run research: `node dist/cli/index.js research run --period 30d --skip-cred-check`
4. View results: `node dist/cli/index.js research dashboard`

---

## License

UNLICENSED
