#!/usr/bin/env bash
# Founder OS — install/verify script for Linux and macOS.
# Checks prerequisites, installs npm dependencies, builds, and runs
# diagnostics. Never installs system packages or pipes a remote script into
# a shell on your behalf — it tells you what's missing and how to get it.
set -euo pipefail

REQUIRED_NODE_MAJOR=18

echo "Founder OS — install"
echo "====================="

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js is not installed. Install Node.js >= 18.18.0 from https://nodejs.org/ and re-run this script."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "✗ Node.js $(node -v) found, but Founder OS requires >= 18.18.0."
  exit 1
fi
echo "✓ Node.js $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  echo "✗ npm is not installed (usually ships with Node.js)."
  exit 1
fi
echo "✓ npm $(npm -v)"

if command -v ollama >/dev/null 2>&1; then
  echo "✓ ollama found: $(ollama --version 2>/dev/null || echo 'installed')"
else
  echo "! ollama is not installed. Founder OS agents run locally against Ollama."
  echo "  Install it from https://ollama.com/download, then run: ollama pull llama3.1"
  echo "  (Founder OS still installs/builds without it — you only need it to execute agents.)"
fi

echo ""
echo "Installing npm dependencies..."
npm ci

echo ""
echo "Building..."
npm run build

echo ""
echo "Running diagnostics (founder doctor)..."
node dist/cli/founder.js doctor || true

cat <<'EOF'

Install complete. Next steps:
  node dist/cli/founder.js agent list
  node dist/cli/founder.js run market-research-agent "Find me a SaaS idea for dentists."
  node dist/cli/founder.js --help

See docs/CLI_GUIDE.md and docs/INSTALL.md for more.
EOF
