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

# A product's own node_modules/next can look installed (directory + npm's
# completion marker both present) while actually missing files deep inside
# next's dist tree — e.g. antivirus quarantining next's require-hook.js
# specifically (a recurring, documented false positive, since it patches
# Node's own require() at runtime). require-hook.js is loaded by next's CLI
# on every startup, so its absence is exactly what produces
# `Cannot find module '../server/require-hook'`. Used as a canary below.
NEXT_REQUIRE_HOOK="node_modules/next/dist/server/require-hook.js"

# npm writes node_modules/.package-lock.json only once an `npm install` has
# finished successfully, so its absence reliably means the install is missing
# or incomplete (interrupted by Ctrl+C, a crashed process, a disk-full error,
# etc.) — checking only for the node_modules directory is not enough, since a
# broken partial install still leaves that directory behind and would
# otherwise be silently treated as "already installed" forever. An optional
# second argument is a canary file (relative to dir) that must also exist —
# see NEXT_REQUIRE_HOOK above; if it's missing despite a "complete" install,
# node_modules is wiped and reinstalled from scratch rather than patched on
# top of, since the underlying corruption would otherwise silently reproduce.
install_if_needed() {
  local dir="$1" canary="${2:-}"
  if [ -f "$dir/node_modules/.package-lock.json" ] && { [ -z "$canary" ] || [ -f "$dir/$canary" ]; }; then
    return
  fi
  if [ -f "$dir/node_modules/.package-lock.json" ] && [ -n "$canary" ] && [ ! -f "$dir/$canary" ]; then
    echo "  $dir: install looked complete but a required file is missing (corrupted or interrupted install) - reinstalling from scratch"
    rm -rf "$dir/node_modules"
  else
    echo "  installing dependencies in $dir"
  fi
  (cd "$dir" && npm install)
}

# shared/platform and shared/ui are consumed by every product via a
# file:../../shared/<name> dependency, which resolves to their built dist/
# output. npm builds dist/ during EACH package's own `npm install` (via its
# "prepare" script) but does not reliably re-run that when the package is
# merely linked in as another project's local file: dependency, so dist/ can
# be stale or missing even though node_modules looks fully installed.
ensure_shared_built() {
  local dir="$1"
  if [ ! -d "$dir/dist" ]; then
    echo "  building $dir (dist/ missing)"
    (cd "$dir" && npm run build)
  fi
}

# file:../../shared/<pkg> dependencies are symlinked by npm on POSIX (and on
# Windows with Developer Mode / symlink privilege enabled) - in that case a
# product always resolves straight through to the live, freshly-built shared
# package, and ensure_shared_built above is all that's needed. Without that
# privilege - the common case on a stock Windows machine - npm silently falls
# back to COPYING the shared package into the product's node_modules at
# install time instead of linking it. That copy is a one-time snapshot: it
# never updates again, even after ensure_shared_built later rebuilds dist/,
# or after any shared/platform or shared/ui source change. A copy taken
# before dist/ existed (or before a later change) is exactly what produces
# "Module not found: Can't resolve '@founder-os/ui/theme'" (or any other
# subpath export) while the real, current dist/theme sits right there in
# shared/ui, untouched. Detect the non-symlink case and refresh the copy on
# every bootstrap run so it can never go stale; when npm did symlink, this is
# a single cheap -L test that no-ops.
#
# Builds into a temp sibling directory first and only removes/replaces the
# real destination once that full copy has succeeded - never delete-then-
# copy. Deleting first and copying second means any failure partway through
# (a locked file, a permission error, anything) leaves the destination
# missing entirely, which is worse than the stale copy this function exists
# to fix, and is indistinguishable from the dependency never having been
# installed at all.
sync_shared_package() {
  local shared_dir="$1" pkg_name="$2" product_dir="$3"
  local dest="$product_dir/node_modules/@founder-os/$pkg_name"
  local tmp="${dest}.bootstrap-tmp-$$"
  if [ -L "$dest" ]; then
    return
  fi
  echo "  refreshing copied dependency @founder-os/$pkg_name in $product_dir"
  rm -rf "$tmp"
  mkdir -p "$tmp"
  cp -r "$shared_dir"/. "$tmp"/
  rm -rf "$tmp/node_modules" "$tmp/tests" "$tmp/.git" "$tmp/coverage"
  rm -rf "$dest"
  mv "$tmp" "$dest"
}

echo
echo "== Installing shared packages =="
install_if_needed "$REPO_ROOT/shared/platform"
install_if_needed "$REPO_ROOT/shared/ui"
ensure_shared_built "$REPO_ROOT/shared/platform"
ensure_shared_built "$REPO_ROOT/shared/ui"

# Every product is independent - its dependencies, database, and migrations
# don't interact with any other product's. A failure in ONE product's setup
# (a transient npm/network error, a locked file, anything) must never
# prevent the other 11 from being bootstrapped. `set -e` at the top of this
# script would normally abort the WHOLE script the instant any command
# anywhere fails - so each product's setup is wrapped in this function and
# called as the tested command of an `if`, which is the standard bash idiom
# for suspending errexit for exactly the duration of that call: a failure
# inside bootstrap_product returns non-zero to the `if` below instead of
# killing the script, and the loop moves on to the next product. Every run
# always attempts all 12.
# Runs entirely in its own subshell with errexit explicitly turned back on:
# testing this function's exit status via `if bootstrap_product ...` (below)
# suspends -e for the whole function body, which would otherwise let a failure
# in, say, install_if_needed silently fall through to every later step instead
# of stopping this product's setup and correctly reporting failure - the
# subshell's own `set -e` restores fail-fast behavior *within* one product's
# setup, while the outer `if` still isolates that failure from every other
# product.
bootstrap_product() (
  set -e
  name="$1"
  product_dir="$REPO_ROOT/products/$name"
  env_file="$product_dir/.env"

  install_if_needed "$product_dir" "$NEXT_REQUIRE_HOOK"
  sync_shared_package "$REPO_ROOT/shared/platform" "platform" "$product_dir"
  sync_shared_package "$REPO_ROOT/shared/ui" "ui" "$product_dir"

  if [ ! -f "$env_file" ]; then
    echo "  writing $env_file"
    session_secret="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
    encryption_key="$(node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))')"
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
)

failed=()
for name in "${PRODUCTS[@]}"; do
  echo
  echo "############ $name ############"
  if bootstrap_product "$name"; then
    echo "  done: $name"
  else
    failed+=("$name")
    echo "  FAILED: $name"
    echo "  (continuing with the remaining products; re-run bootstrap afterward to retry $name)"
  fi
done

echo
echo "== Bootstrap complete =="
if [ "${#failed[@]}" -eq 0 ]; then
  echo "All ${#PRODUCTS[@]} databases exist, are migrated, and are seeded."
else
  echo "$((${#PRODUCTS[@]} - ${#failed[@]}))/${#PRODUCTS[@]} products bootstrapped successfully."
  echo "Failed: ${failed[*]} — see the FAILED lines above for why. Re-run bootstrap to retry just those (already-successful products are skipped instantly)."
fi
echo "Next: cd infrastructure/launcher && npm install && npm run portfolio:dev"
if [ "${#failed[@]}" -ne 0 ]; then
  exit 1
fi
