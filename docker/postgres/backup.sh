#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  CampusHub Database Backup Script
#  Usage: ./backup.sh [--upload-s3]
#  Cron:  0 2 * * * /opt/campushub/docker/postgres/backup.sh --upload-s3
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/opt/campushub/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_NAME="${DB_NAME:-campushub}"
DB_USER="${DB_USER:-campushub_user}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
S3_BUCKET="${S3_BUCKET:-}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/campushub_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# ── Setup ─────────────────────────────────────────────────────────────────────
mkdir -p "${BACKUP_DIR}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

log "Starting backup: ${BACKUP_FILE}"

# ── Dump ─────────────────────────────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q campushub_db; then
  # Running inside Docker environment
  docker exec campushub_db pg_dump \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --no-password \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "${BACKUP_FILE}"
else
  # Direct pg_dump
  PGPASSWORD="${DB_PASSWORD:-}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    --format=plain \
    --no-owner \
    --no-acl \
    | gzip > "${BACKUP_FILE}"
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
log "Backup complete: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ── Upload to S3 ──────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--upload-s3" ]] && [[ -n "${S3_BUCKET}" ]]; then
  log "Uploading to S3: s3://${S3_BUCKET}/backups/"
  aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/" \
    --storage-class STANDARD_IA \
    --sse AES256
  log "S3 upload complete."
fi

# ── Cleanup old backups ───────────────────────────────────────────────────────
log "Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "campushub_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
log "Cleanup complete."

# ── Verify backup integrity ───────────────────────────────────────────────────
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  log "Backup integrity check PASSED."
else
  log "ERROR: Backup integrity check FAILED for ${BACKUP_FILE}"
  exit 1
fi

log "Backup job finished successfully."
