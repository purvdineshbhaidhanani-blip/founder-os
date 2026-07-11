#!/usr/bin/env bash
# Bootstraps local Postgres databases, .env files, Prisma schemas, and
# seed data for every product in the portfolio. Idempotent — safe to
# re-run. Assumes Postgres and Redis are already running and reachable
# at the defaults below (override via env vars if yours differ).
#
# Usage:
#   cd infrastructure/launcher
#   ./bootstrap.sh
#
# What it does per product:
#   1. Writes products/<name>/.env from .env.example if missing, with a
#      generated session secret / encryption key.
#   2. Creates the product's Postgres database if it doesn't exist.
#   3. Applies shared/platform's migrations to that database's `public`
#      schema.
#   4. Runs `npm install` (products, shared/platform, shared/ui) if
#      node_modules is missing.
#   5. Applies the product's own migrations to its `<product>_app` schema
#      and generates its Prisma client.
#   6. Seeds the product's billing plans.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGUSER="${PGUSER:-postgres}"
PGPASSWORD_VALUE="${PGPASSWORD:-postgres}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

PRODUCTS=(spendgov seccorrelate codeaudit crmcapture incidenttriage authstartup erpaudit contactverify characterconsistency payrollaudit transcriptionqa schemalint)

echo "== Checking Postgres and Redis are reachable =="
PGPASSWORD="$PGPASSWORD_VALUE" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -c "select 1" postgres >/dev/null \
  || { echo "Cannot reach Postgres at $PGHOST:$PGPORT as $PGUSER. Start it first."; exit 1; }
redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1 \
  || { echo "Cannot reach Redis at $REDIS_URL. Start it first."; exit 1; }
echo "Postgres and Redis are up."

install_if_needed() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    echo "  installing dependencies in $dir"
    (cd "$dir" && npm install)
  fi
}

echo
echo "== Installing shared packages =="
install_if_needed "$REPO_ROOT/shared/platform"
install_if_needed "$REPO_ROOT/shared/ui"

for name in "${PRODUCTS[@]}"; do
  echo
  echo "############ $name ############"
  product_dir="$REPO_ROOT/products/$name"
  env_file="$product_dir/.env"

  install_if_needed "$product_dir"

  if [ ! -f "$env_file" ]; then
    echo "  writing $env_file"
    session_secret="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
    encryption_key="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
    upper_name="$(echo "$name" | tr '[:lower:]' '[:upper:]')"
    sed \
      -e "s#^PLATFORM_SESSION_SECRET=.*#PLATFORM_SESSION_SECRET=${session_secret}#" \
      -e "s#^PLATFORM_ENCRYPTION_KEY=.*#PLATFORM_ENCRYPTION_KEY=${encryption_key}#" \
      -e "s#^PLATFORM_REDIS_URL=.*#PLATFORM_REDIS_URL=${REDIS_URL}#" \
      "$product_dir/.env.example" > "$env_file"
    echo "  (AI provider keys and Stripe keys left blank — those features fail closed until Phase 2 credentials are added.)"
  else
    echo "  $env_file already exists, leaving it as-is"
  fi

  echo "  ensuring database \"$name\" exists"
  PGPASSWORD="$PGPASSWORD_VALUE" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -tc "SELECT 1 FROM pg_database WHERE datname = '$name'" postgres | grep -q 1 \
    || PGPASSWORD="$PGPASSWORD_VALUE" createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$name"

  db_url="postgresql://${PGUSER}:${PGPASSWORD_VALUE}@${PGHOST}:${PGPORT}/${name}"

  echo "  applying shared platform migrations (public schema)"
  (cd "$REPO_ROOT/shared/platform" && PLATFORM_DATABASE_URL="$db_url" npx prisma migrate deploy >/dev/null)

  echo "  applying $name migrations + generating Prisma client"
  (cd "$product_dir" && npx prisma migrate deploy >/dev/null && npx prisma generate >/dev/null)

  echo "  seeding billing plans"
  (cd "$product_dir" && npm run prisma:seed >/dev/null 2>&1)

  echo "  done: $name"
done

echo
echo "== Bootstrap complete =="
echo "All 12 databases exist, are migrated, and are seeded."
echo "Next: cd infrastructure/launcher && npm install && npm run portfolio:dev"
