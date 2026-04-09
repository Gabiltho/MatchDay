#!/bin/bash
# Unified start/stop script for dev and production environments.
#
# Usage:
#   ./start.sh [dev|prod] [up|down|logs|ps|build]
#
# Examples:
#   ./start.sh dev             # start dev environment (default: up -d)
#   ./start.sh prod            # start prod environment
#   ./start.sh dev down        # stop dev environment
#   ./start.sh prod logs       # tail production logs
#   ./start.sh dev build       # rebuild dev images
#   ./start.sh dev ps          # show running containers
#
# Environment files:
#   dev  → docker-compose.yml      + .env
#   prod → docker-compose.prod.yml + .env.prod

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Parse arguments ──────────────────────────────────────────────────────────

ENV="${1:-dev}"
CMD="${2:-up}"

case "$ENV" in
    dev)
        COMPOSE_FILE="docker-compose.yml"
        ENV_FILE=".env"
        ;;
    prod)
        COMPOSE_FILE="docker-compose.prod.yml"
        ENV_FILE=".env.prod"
        ;;
    *)
        echo "Error: unknown environment '$ENV'. Use 'dev' or 'prod'."
        echo "Usage: $0 [dev|prod] [up|down|logs|ps|build]"
        exit 1
        ;;
esac

cd "$SCRIPT_DIR"

# ─── Pre-flight checks ────────────────────────────────────────────────────────

if ! command -v docker &> /dev/null; then
    echo "Error: docker is not installed."
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "Warning: $ENV_FILE not found — using defaults."
fi

# ─── Compose helper ───────────────────────────────────────────────────────────

compose() {
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"
}

# ─── Run command ──────────────────────────────────────────────────────────────

echo "=== MatchDay [$ENV] — $CMD ==="

case "$CMD" in
    up)
        compose up -d
        echo ""
        compose ps
        ;;
    down)
        compose down
        ;;
    logs)
        compose logs -f
        ;;
    ps)
        compose ps
        ;;
    build)
        compose build --no-cache
        ;;
    restart)
        compose down
        compose up -d
        echo ""
        compose ps
        ;;
    *)
        # Pass any other command directly to docker compose
        compose "$CMD" "${@:3}"
        ;;
esac