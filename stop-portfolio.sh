#!/usr/bin/env bash
# Founder OS — stop the whole portfolio (macOS / Linux).
#
#   ./stop-portfolio.sh
#
# Frees ports 3000-3012 (launcher + all 12 products). PostgreSQL and Redis are
# left running (other things may depend on them).

set -euo pipefail
cd "$(dirname "$0")/infrastructure/launcher"
echo "== Stopping Founder OS portfolio =="
node scripts/stop-portfolio.mjs
echo "Done."
