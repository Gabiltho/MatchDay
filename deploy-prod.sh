#!/bin/bash
# Production deployment script for MatchDay
# Run this script on the VM (192.168.1.114)
#
# Smart deployment: detects which service changed and only rebuilds/restarts it.

set -e

echo "=== MatchDay Production Deployment ==="

# ─── Helpers ────────────────────────────────────────────────────────────────

check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "Error: $1 is not installed"
        exit 1
    fi
}

# ─── Pre-flight checks ───────────────────────────────────────────────────────

cd "$(dirname "$0")"

echo "1. Checking dependencies..."
check_command docker

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "Error: Docker Compose is not installed"
    exit 1
fi

if [ ! -f ".env.prod" ]; then
    echo "Error: .env.prod file not found."
    exit 1
fi

# ─── Source code update ──────────────────────────────────────────────────────

echo "2. Pulling latest changes from main..."
git fetch origin main
git checkout main

PREV_COMMIT=$(cat .last-deployed-commit 2>/dev/null || echo "")
git pull origin main
CURRENT_COMMIT=$(git rev-parse HEAD)

# ─── Detect what changed ─────────────────────────────────────────────────────

echo "3. Detecting changes..."

DEPLOY_FRONTEND=false
DEPLOY_BACKEND=false

if [ -z "$PREV_COMMIT" ] || [ "$PREV_COMMIT" = "$CURRENT_COMMIT" ]; then
    echo "   First deploy or forced redeploy — building everything."
    DEPLOY_FRONTEND=true
    DEPLOY_BACKEND=true
else
    CHANGED=$(git diff --name-only "$PREV_COMMIT" "$CURRENT_COMMIT" 2>/dev/null || echo "")
    echo "   Changed files since last deploy:"
    echo "$CHANGED" | sed 's/^/     /'

    echo "$CHANGED" | grep -qE "^frontend/" && DEPLOY_FRONTEND=true
    echo "$CHANGED" | grep -qE "^backend/"  && DEPLOY_BACKEND=true

    if echo "$CHANGED" | grep -qE "^docker-compose|^\.env"; then
        DEPLOY_FRONTEND=true
        DEPLOY_BACKEND=true
    fi
fi

if ! $DEPLOY_FRONTEND && ! $DEPLOY_BACKEND; then
    echo "   No frontend or backend changes detected — skipping rebuild."
    echo "=== Nothing to deploy ==="
    exit 0
fi

echo "   Deploy frontend : $DEPLOY_FRONTEND"
echo "   Deploy backend  : $DEPLOY_BACKEND"

# ─── Build only what changed ─────────────────────────────────────────────────

echo "4. Building changed services..."
SERVICES_TO_BUILD=""
$DEPLOY_BACKEND  && SERVICES_TO_BUILD="$SERVICES_TO_BUILD backend"
$DEPLOY_FRONTEND && SERVICES_TO_BUILD="$SERVICES_TO_BUILD frontend"

docker compose -f docker-compose.prod.yml --env-file .env.prod build $SERVICES_TO_BUILD

# ─── Rolling restart of changed services ─────────────────────────────────────

echo "5. Restarting changed services..."

$DEPLOY_BACKEND  && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps backend
$DEPLOY_FRONTEND && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps frontend

# ─── Save deployed commit ────────────────────────────────────────────────────

echo "$CURRENT_COMMIT" > .last-deployed-commit

# ─── Final status ────────────────────────────────────────────────────────────

echo "6. Service status:"
docker compose -f docker-compose.prod.yml --env-file .env.prod ps

echo ""
echo "=== Deployment Complete ==="
