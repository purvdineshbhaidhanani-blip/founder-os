#!/usr/bin/env bash
# Founder OS — one-command portfolio startup for macOS / Linux.
#
#   ./start-portfolio.sh              # dev mode (hot reload, more RAM/CPU)
#   ./start-portfolio.sh --production # optimized build, much lighter — use
#                                      # this if dev mode is slow/unstable on
#                                      # your machine (12 concurrent dev
#                                      # servers is RAM-heavy)
#
# Starts PostgreSQL and Redis if they aren't already running, then hands off to
# the cross-platform orchestrator which bootstraps every database, launches the
# launcher (3000) + all 12 products (3001-3012), waits until every server is
# reachable, and opens http://localhost:3000. Ctrl+C stops everything.

set -euo pipefail
cd "$(dirname "$0")"

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3>&- 2>/dev/null; }

wait_port() {
  local port="$1" secs="${2:-30}" i=0
  while [ "$i" -lt "$secs" ]; do
    if port_open "$port"; then return 0; fi
    sleep 1; i=$((i + 1))
  done
  return 1
}

echo "== Founder OS portfolio startup =="

command -v node >/dev/null 2>&1 || { echo "Node.js not found — install Node 20+ and re-run."; exit 1; }
echo "Node $(node --version) detected."

# PostgreSQL on 5432
if port_open 5432; then
  echo "PostgreSQL already running on 5432."
else
  echo "PostgreSQL not reachable on 5432 — attempting to start it…"
  if command -v brew >/dev/null 2>&1 && brew services list >/dev/null 2>&1; then
    brew services start postgresql@16 || brew services start postgresql || true
  elif command -v pg_ctlcluster >/dev/null 2>&1; then
    sudo pg_ctlcluster 16 main start || pg_ctlcluster 16 main start || true
  elif command -v systemctl >/dev/null 2>&1; then
    sudo systemctl start postgresql || true
  elif command -v docker >/dev/null 2>&1; then
    docker start founderos-pg 2>/dev/null || \
      docker run -d --name founderos-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16 >/dev/null
  fi
  wait_port 5432 30 || { echo "Could not start PostgreSQL on 5432. Start it manually and re-run."; exit 1; }
  echo "PostgreSQL is up."
fi

# Redis on 6379
if port_open 6379; then
  echo "Redis already running on 6379."
else
  echo "Redis not reachable on 6379 — attempting to start it…"
  if command -v brew >/dev/null 2>&1 && brew services list >/dev/null 2>&1; then
    brew services start redis || true
  elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q redis; then
    sudo systemctl start redis-server || sudo systemctl start redis || true
  elif command -v redis-server >/dev/null 2>&1; then
    redis-server --daemonize yes || true
  elif command -v docker >/dev/null 2>&1; then
    docker start founderos-redis 2>/dev/null || \
      docker run -d --name founderos-redis -p 6379:6379 redis:7 >/dev/null
  fi
  wait_port 6379 30 || { echo "Could not start Redis on 6379. Start it manually and re-run."; exit 1; }
  echo "Redis is up."
fi

cd infrastructure/launcher
[ -d node_modules ] || { echo "Installing launcher dependencies…"; npm install; }

echo "Handing off to the cross-platform orchestrator…"
exec node scripts/start-portfolio.mjs "$@"
