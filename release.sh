#!/bin/bash
# Push and deploy MatchDay to the VM.
#
# Usage: ./release.sh
#
# Environment overrides (optional, or set in .env.release):
#   VM_USER     SSH user on the VM           (default: thomas)
#   VM_HOST     VM hostname or IP            (default: 192.168.1.114)
#   VM_APP_DIR  App directory on the VM      (default: /home/thomas/apps/matchday)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Load optional local config ───────────────────────────────────────────────

if [ -f "${SCRIPT_DIR}/.env.release" ]; then
    # shellcheck disable=SC1091
    set -o allexport; source "${SCRIPT_DIR}/.env.release"; set +o allexport
fi

VM_USER="${VM_USER:-thomas}"
VM_HOST="${VM_HOST:-192.168.1.114}"
VM_APP_DIR="${VM_APP_DIR:-/home/thomas/apps/matchday}"

echo "╔══════════════════════════════════════════════╗"
echo "║            MatchDay — Deploy                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ─── Push to main ────────────────────────────────────────────────────────────

echo "[1/2] Pushing to main..."
cd "$SCRIPT_DIR"
git push origin HEAD:main
echo "   Pushed."

# ─── Deploy on VM ────────────────────────────────────────────────────────────

DEPLOY_LOG="/tmp/matchday-deploy.log"

echo ""
echo "[2/2] Deploying to VM..."
echo "   Deploy log : ${DEPLOY_LOG}"
echo ""

DEPLOY_STATUS=0
printf "   [ ] Deploy on VM..."
ssh -o BatchMode=yes -o ConnectTimeout=10 \
    -o ServerAliveInterval=30 -o ServerAliveCountMax=20 \
    "${VM_USER}@${VM_HOST}" \
    "cd ${VM_APP_DIR} && bash deploy-prod.sh" \
    > "$DEPLOY_LOG" 2>&1 || DEPLOY_STATUS=$?
printf "\r   [✓] Deploy on VM\n"

echo ""

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo "   Deploy : OK"
    grep -E "Deployment Complete|Error" "$DEPLOY_LOG" | sed 's/^/              /' || true
else
    echo "   Deploy : FAILED (exit ${DEPLOY_STATUS})"
    echo "   --- Last 40 lines of ${DEPLOY_LOG} ---"
    tail -40 "$DEPLOY_LOG" | sed 's/^/   | /'
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           MatchDay deployed!                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Full deploy log : ${DEPLOY_LOG}"
