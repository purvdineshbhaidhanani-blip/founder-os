# Installing Founder OS

Founder OS runs entirely locally: no external accounts, no API keys, no
cloud dependency for the agent-execution runtime (the web dashboard's
optional Supabase persistence and Google Sign-In are separate, opt-in
features — see `DEPLOYMENT.md`). This document covers getting the `founder`
CLI running on a fresh machine.

## Prerequisites
- **Node.js >= 18.18.0** — https://nodejs.org/
- **Ollama** (optional but needed to actually execute agents) — https://ollama.com/download
- **git** (for the Git Tools; also needed to clone this repo)

## Linux / macOS
```
git clone <this-repo>
cd founder-os
./scripts/install.sh
```
`install.sh` checks Node/npm/Ollama, runs `npm ci && npm run build`, and
finishes with `founder doctor` so you immediately see what's ready and
what's missing. It never installs system packages or pipes a remote script
into a shell — if Ollama is missing, it prints the official download link.

## Windows (PowerShell)
```
git clone <this-repo>
cd founder-os
./scripts/install.ps1
```
Same checks and steps as `install.sh`, PowerShell-native.

## Manual install (any OS)
```
npm ci
npm run build
node dist/cli/founder.js doctor
```

## Set up Ollama (required to execute agents)
```
ollama serve            # start the daemon (or install it as a service)
ollama pull llama3.1     # pull the default model (or set FOUNDER_DEFAULT_MODEL)
```

## Docker
```
docker build -t founder-os .
docker run --rm -it founder-os node dist/cli/founder.js doctor
# or the full stack (server + bundled Ollama):
docker compose up
docker compose run --rm founder-os node dist/cli/founder.js run market-research-agent "Find me a SaaS idea for dentists." --tools
```
See `Dockerfile` and `docker-compose.yml` for the exact image layout.

## Verify the install
```
node dist/cli/founder.js doctor
node dist/cli/founder.js agent list
node dist/cli/founder.js run market-research-agent "Find me a SaaS idea for dentists."
```

## Quick-start
```
founder doctor                                             # confirm everything's ready
founder tools list                                          # see what agents can do
founder run market-research-agent "Find me a SaaS idea for dentists." --tools
```

See `docs/CLI_GUIDE.md` for the full command reference and
`docs/CONFIGURATION.md` for every environment variable.
