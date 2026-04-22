#!/usr/bin/env bash
# Start local backend: Docker Postgres (if needed) → Prisma migrate → API dev server.
# Usage: from repo root: ./scripts/dev-backend.sh  |  or:  bun run dev:backend
#
# Environment:
#   SKIP_DOCKER=1  — skip "docker compose up -d postgres" (Postgres already running)
#   SKIP_MIGRATE=1 — skip "prisma migrate deploy"
#
# Picks a free host port for Postgres (default 5432, else 5433, …) and aligns apps/api/.env
# when DATABASE_URL points at 127.0.0.1 or localhost. Override with a repo-root .env:
#   POSTGRES_PUBLISH_PORT=5433

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> botttle backend (repo: $ROOT)"

if [[ ! -f "$ROOT/apps/api/.env" ]]; then
  echo "==> No apps/api/.env — copying from .env.example"
  cp "$ROOT/apps/api/.env.example" "$ROOT/apps/api/.env"
  echo "    Edit apps/api/.env: set JWT_SECRET and REFRESH_SECRET (and DATABASE_URL if not using Docker defaults)."
fi

# Returns 0 if something is accepting TCP on 127.0.0.1:$1
tcp_listening() {
  local p=$1
  if command -v nc &>/dev/null; then
    nc -z 127.0.0.1 "$p" 2>/dev/null
  else
    timeout 0.2 bash -c "echo > /dev/tcp/127.0.0.1/$p" 2>/dev/null
  fi
}

# If compose postgres is already running, use its host port. Else first free 5432..5436, else root .env.
pick_publish_port() {
  local cid hp v
  cid=$(docker compose ps -q postgres 2>/dev/null) || true
  if [[ -n "${cid:-}" ]]; then
    if docker ps --no-trunc -q -f "id=$cid" -f "status=running" 2>/dev/null | grep -q .; then
      hp=$(docker port "$cid" 5432 2>/dev/null | head -1 | awk -F: '{print $NF}') || true
      if [[ -n "${hp:-}" ]]; then
        echo "$hp"
        return
      fi
    fi
  fi
  if [[ -f "$ROOT/.env" ]]; then
    v=$(grep -E '^[[:space:]]*POSTGRES_PUBLISH_PORT=' "$ROOT/.env" 2>/dev/null | head -1 || true)
    v="${v#*=}"
    v="${v%$'\r'}"
    v="${v//\"/}"
    v="${v//\'/}"
    v="${v//[[:space:]]/}"
    if [[ -n "$v" ]] && ! tcp_listening "$v"; then
      echo "$v"
      return
    fi
  fi
  for p in 5432 5433 5434 5435 5436; do
    if ! tcp_listening "$p"; then
      echo "$p"
      return
    fi
  done
  echo "error: no free port in 5432–5436. Set POSTGRES_PUBLISH_PORT in a repo-root .env." >&2
  return 1
}

# Align local DATABASE_URL port with host publish port
sync_database_url() {
  local p=$1
  if ! grep -qE '^DATABASE_URL=.*(127\.0\.0\.1|localhost):' "$ROOT/apps/api/.env" 2>/dev/null; then
    return 0
  fi
  if grep -qE "^DATABASE_URL=.*(127\\.0\\.0\\.1|localhost):${p}(/|\"|')" "$ROOT/apps/api/.env" 2>/dev/null; then
    return 0
  fi
  echo "==> Setting apps/api/.env DATABASE_URL to use host port $p (Docker Postgres)"
  if command -v perl &>/dev/null; then
    BOTTTLE_PG_PORT="$p" perl -i -pe 's/(@127\.0\.0\.1:)([0-9]+)/$1$ENV{BOTTTLE_PG_PORT}/ if /^DATABASE_URL=/; s/(@localhost:)([0-9]+)/$1$ENV{BOTTTLE_PG_PORT}/ if /^DATABASE_URL=/' "$ROOT/apps/api/.env" || true
  else
    sed -i.bak "s/\\(127.0.0.1:\\)[0-9]*/\\1${p}/" "$ROOT/apps/api/.env" 2>/dev/null || true
    sed -i.bak "s/\\(localhost:\\)[0-9]*/\\1${p}/" "$ROOT/apps/api/.env" 2>/dev/null || true
    rm -f "$ROOT/apps/api/.env.bak" 2>/dev/null || true
  fi
}

if [[ "${SKIP_DOCKER:-0}" == "1" ]]; then
  echo "==> SKIP_DOCKER=1 — not starting Docker (ensure DATABASE_URL is reachable)"
else
  if ! command -v docker &>/dev/null; then
    echo "error: docker not found. Install Docker or set SKIP_DOCKER=1 with Postgres on localhost." >&2
    exit 1
  fi

  PUBLISH=$(pick_publish_port) || exit 1
  export POSTGRES_PUBLISH_PORT="$PUBLISH"
  sync_database_url "$PUBLISH"

  if docker compose ps postgres 2>/dev/null | grep -Eqi 'Up|healthy|running'; then
    echo "==> PostgreSQL (compose) is already up on host port $PUBLISH — skipping docker compose up"
  else
    echo "==> Starting PostgreSQL (docker compose up -d postgres) on host port $PUBLISH"
    if ! docker compose up -d postgres; then
      echo "" >&2
      echo "docker compose failed. Try: docker compose down && $0" >&2
      echo "Or: SKIP_DOCKER=1 $0" >&2
      exit 1
    fi
  fi

  echo "==> Waiting for PostgreSQL to accept connections..."
  for _ in $(seq 1 90); do
    if docker compose exec -T postgres pg_isready -U botttle -d botttle &>/dev/null; then
      break
    fi
    sleep 1
  done
  if ! docker compose exec -T postgres pg_isready -U botttle -d botttle &>/dev/null; then
    echo "error: Postgres did not become ready in time. Check: docker compose ps" >&2
    exit 1
  fi
  echo "    Postgres is ready (localhost:$PUBLISH)."
fi

# Export vars from .env for migrate (after possible DATABASE_URL sync)
set -a
# shellcheck disable=SC1091
source "$ROOT/apps/api/.env"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "error: DATABASE_URL is empty in apps/api/.env" >&2
  exit 1
fi

if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  echo "==> prisma migrate deploy"
  (cd "$ROOT/packages/db" && bunx prisma migrate deploy)
else
  echo "==> SKIP_MIGRATE=1 — skipping migrations"
fi

echo "==> API dev server (http://localhost:3001) — Ctrl+C to stop"
exec bun run dev:api
