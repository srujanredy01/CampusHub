#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
#  CampusHub Backend — Production Entrypoint
#  Runs migrations, collects static, creates admin, starts Daphne (ASGI)
# ─────────────────────────────────────────────────────────────────────────────
set -e

echo "=== CampusHub Backend Starting ==="
echo "DB_HOST=${DB_HOST:-not set}"
echo "DB_NAME=${DB_NAME:-not set}"

# Fix ownership of mounted volumes
chown -R appuser:appgroup /app/logs /app/staticfiles /app/media 2>/dev/null || true

# Wait for database to be ready
echo "[0/4] Waiting for database..."
MAX_RETRIES=30
RETRY_COUNT=0
until python manage.py check --database default > /dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "ERROR: Database not ready after $MAX_RETRIES attempts."
        exit 1
    fi
    echo "  Waiting for DB... attempt $RETRY_COUNT/$MAX_RETRIES"
    sleep 2
done
echo "  Database is ready."

# Run migrations
echo "[1/4] Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "[2/4] Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create admin account
echo "[3/4] Creating admin account..."
python manage.py create_admin --noinput 2>/dev/null || true

echo "[4/4] Starting application server..."

# Start Daphne (ASGI) for HTTP + WebSocket support
# Using daphne instead of gunicorn to support WebSocket connections
exec daphne campushub.asgi:application \
    --bind 0.0.0.0 \
    --port 8000 \
    --verbosity 1 \
    --access-log - \
    --proxy-headers
