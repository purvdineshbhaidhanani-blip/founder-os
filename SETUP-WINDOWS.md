# Founder OS — Windows Setup Guide

## Prerequisites

- **Node.js** ≥ 18.18.0 ([download](https://nodejs.org/))
- **Git** ([download](https://git-scm.com/))
- **Environment variables** for API keys (optional, see below)

## Quick Start

### 1. Clone Repository
```cmd
git clone <repo-url>
cd founder-os
```

### 2. Install Dependencies
```cmd
npm install
```

### 3. Build Project
```cmd
npm run build
```

### 4. Run Research (Last 30 Days)
```cmd
node dist/cli/index.js research run --period 30d --skip-cred-check
```

### 5. View Dashboard
```cmd
node dist/cli/index.js research dashboard
```

### 6. View Report
```cmd
node dist/cli/index.js research report
```

---

## Credentials (Optional)

To enable real API collection, set environment variables:

### Windows (Command Prompt)
```cmd
set GITHUB_TOKEN=your_token_here
set YOUTUBE_API_KEY=your_key_here
set STACKEXCHANGE_API_KEY=your_key_here
```

### Windows (PowerShell)
```powershell
$env:GITHUB_TOKEN="your_token_here"
$env:YOUTUBE_API_KEY="your_key_here"
$env:STACKEXCHANGE_API_KEY="your_key_here"
```

### Windows (Batch File - `.env.local`)
Create `.env.local` in project root:
```
GITHUB_TOKEN=your_token_here
YOUTUBE_API_KEY=your_key_here
STACKEXCHANGE_API_KEY=your_key_here
```

Then run without `--skip-cred-check`:
```cmd
node dist/cli/index.js research run --period 30d
```

---

## All Research Commands

| Command | Purpose |
|---------|---------|
| `node dist/cli/index.js research run --period 30d` | Execute research (7d, 30d, 90d, or custom range) |
| `node dist/cli/index.js research dashboard` | View full stats: champion, top 10, health |
| `node dist/cli/index.js research history` | List all past research sessions |
| `node dist/cli/index.js research show <sessionId>` | Details of one session |
| `node dist/cli/index.js research report` | Detailed Founder Report (latest session) |
| `node dist/cli/index.js research export <sessionId> --format md` | Export as Markdown |
| `node dist/cli/index.js research export <sessionId> --format json` | Export as JSON |
| `node dist/cli/index.js research compare <idA> <idB>` | Diff two sessions |
| `node dist/cli/index.js research search <query>` | Search opportunities |
| `node dist/cli/index.js research health` | Connector health stats |
| `node dist/cli/index.js research config` | View/edit config |
| `node dist/cli/index.js research opp-history` | Opportunity score history |

---

## Create Batch Wrapper (Optional)

Create `research.bat` in project root:

```batch
@echo off
node dist/cli/index.js research %*
```

Then use:
```cmd
research.bat run --period 30d
research.bat dashboard
research.bat report
```

---

## Create PowerShell Wrapper (Optional)

Create `research.ps1` in project root:

```powershell
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$args)
node dist/cli/index.js research @args
```

Then use:
```powershell
.\research.ps1 run --period 30d
.\research.ps1 dashboard
.\research.ps1 report
```

---

## Verify Installation

```cmd
npm run test
```

Expected: `370 passed`

```cmd
npm run typecheck
```

Expected: No errors

---

## Data Storage

All research data persists to:
```
.founder-os/research/
```

Directories created automatically:
- `.founder-os/research/` — session data
- `.founder-os/exports/` — exported reports
- `.founder-os/checkpoints/` — resume failed research
- `.founder-os/connector-health.json` — API health stats
- `.founder-os/opportunity-history.json` — score tracking
- `.founder-os/config.json` — preferences

---

## Troubleshooting

### "npm: command not found"
Install Node.js from https://nodejs.org/

### "node: command not found"
Restart terminal after installing Node.js

### Build fails
```cmd
npm install
npm run build
```

### CLI doesn't work
Verify dist folder exists:
```cmd
dir dist\cli\index.js
```

If missing, rebuild:
```cmd
npm run build
```

### Research returns no data
Add credentials to `.env.local` or `--skip-cred-check` to test with public data only

---

## Next Steps

1. **Run research:** `node dist/cli/index.js research run --period 30d`
2. **View results:** `node dist/cli/index.js research dashboard`
3. **Generate report:** `node dist/cli/index.js research report`
4. **Export report:** `node dist/cli/index.js research export latest --format md`

---

## Support

- TypeScript issues: `npm run typecheck`
- Test failures: `npm run test`
- Build problems: Delete `dist/` folder and run `npm run build` again
