#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
#  CampusHub Backend — Production Entrypoint
#  Runs all commands directly (container runs as root, gunicorn drops to appuser)
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

# Create cache table (ignore if exists)
echo "[2/4] Creating cache table..."
python manage.py createcachetable 2>/dev/null || true

# Collect static files
echo "[3/4] Collecting static files..."
python manage.py collectstatic --noinput --clear

# Create admin account
echo "[4/4] Creating admin account..."
python manage.py create_admin --noinput 2>/dev/null || true

echo "=== Starting Gunicorn ==="

# Start gunicorn (exec replaces shell for proper signal handling)
exec gunicorn campushub.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --worker-class sync \
    --timeout 120 \
    --keep-alive 5 \
    --max-requests 1000 \
    --max-requests-jitter 100 \
    --access-logfile - \
    --error-logfile - \
    --log-level warning \
    --user appuser \
    --group appgroup
