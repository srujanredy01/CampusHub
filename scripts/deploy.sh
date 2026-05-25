#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  CampusHub — Quick Deploy Script (run on EC2)
#  Usage: ./scripts/deploy.sh
#
#  This script:
#    1. Pulls latest code
#    2. Rebuilds containers
#    3. Runs migrations
#    4. Verifies health
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="/opt/campushub"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE="./backend/.env"

cd "${PROJECT_DIR}"

echo "======================================"
echo "  CampusHub Deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"

# Save current commit for rollback
PREV_COMMIT=$(git rev-parse HEAD 2>/dev/null || echo "none")

# Pull latest
echo "[1/5] Pulling latest code..."
git fetch origin main
git reset --hard origin/main
echo "  Commit: $(git log -1 --oneline)"

# Stop old containers
echo "[2/5] Stopping containers..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down --remove-orphans || true

# Clean old images
echo "[3/5] Cleaning old images..."
docker image prune -f || true

# Build and start
echo "[4/5] Building and starting..."
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up --build -d

# Wait for health
echo "[5/5] Waiting for backend health..."
HEALTHY=false
for i in $(seq 1 30); do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' campushub_backend 2>/dev/null || echo "starting")
    echo "  Attempt $i/30 — status: $STATUS"
    if [ "$STATUS" = "healthy" ]; then
        HEALTHY=true
        break
    fi
    sleep 5
done

if [ "$HEALTHY" = "false" ]; then
    echo "  ERROR: Backend not healthy. Showing logs..."
    docker logs campushub_backend --tail=50
    echo ""
    echo "  Rolling back to ${PREV_COMMIT}..."
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down || true
    git reset --hard "${PREV_COMMIT}"
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up --build -d
    exit 1
fi

# Final verification
echo ""
echo "  Container status:"
docker compose -f "${COMPOSE_FILE}" ps
echo ""

# Test endpoints
echo "  Testing endpoints..."
curl -sf http://localhost/api/health/ && echo "  ✓ API health OK" || echo "  ✗ API health FAILED"
curl -sf http://localhost/health && echo "  ✓ Nginx health OK" || echo "  ✗ Nginx health FAILED"

echo ""
echo "======================================"
echo "  Deploy Complete!"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"
