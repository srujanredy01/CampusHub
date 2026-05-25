#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  CampusHub — Validate .env file before deployment
#  Usage: ./scripts/validate-env.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE="${1:-./backend/.env}"
ERRORS=0

echo "Validating: ${ENV_FILE}"
echo ""

if [ ! -f "${ENV_FILE}" ]; then
    echo "ERROR: ${ENV_FILE} not found!"
    echo "  Run: cp backend/.env.production backend/.env"
    exit 1
fi

# Source the env file
set -a
source "${ENV_FILE}"
set +a

check_not_placeholder() {
    local var_name="$1"
    local var_value="${!var_name:-}"
    local placeholder_patterns=("CHANGE_ME" "YOUR_" "your_" "your-" "change-me")

    if [ -z "${var_value}" ]; then
        echo "  ERROR: ${var_name} is empty"
        ERRORS=$((ERRORS + 1))
        return
    fi

    for pattern in "${placeholder_patterns[@]}"; do
        if echo "${var_value}" | grep -qi "${pattern}"; then
            echo "  ERROR: ${var_name} still contains placeholder value"
            ERRORS=$((ERRORS + 1))
            return
        fi
    done

    echo "  OK: ${var_name}"
}

echo "── Required Variables ──────────────────────────────────────────"
check_not_placeholder "SECRET_KEY"
check_not_placeholder "DB_PASSWORD"
check_not_placeholder "ADMIN_PASSWORD"

echo ""
echo "── Network Configuration ────────────────────────────────────────"
check_not_placeholder "ALLOWED_HOSTS"
check_not_placeholder "CORS_ALLOWED_ORIGINS"
check_not_placeholder "CSRF_TRUSTED_ORIGINS"
check_not_placeholder "FRONTEND_URL"

echo ""
echo "── Safety Checks ────────────────────────────────────────────────"

if [ "${DEBUG:-True}" = "True" ] || [ "${DEBUG:-true}" = "true" ]; then
    echo "  ERROR: DEBUG must be False in production"
    ERRORS=$((ERRORS + 1))
else
    echo "  OK: DEBUG=False"
fi

if [ "${SECRET_KEY:-}" = "campushub-local-secret-key-change-in-production-abc123xyz" ]; then
    echo "  ERROR: SECRET_KEY is still the local development key"
    ERRORS=$((ERRORS + 1))
fi

if [ "${SECRET_KEY:-}" = "django-insecure-dev-key-change-me" ]; then
    echo "  ERROR: SECRET_KEY is the insecure default"
    ERRORS=$((ERRORS + 1))
fi

if [ "${DB_PASSWORD:-}" = "campushub_pass" ]; then
    echo "  WARNING: DB_PASSWORD is still the default development password"
    ERRORS=$((ERRORS + 1))
fi

if [ "${ADMIN_PASSWORD:-}" = "Admin@123" ]; then
    echo "  WARNING: ADMIN_PASSWORD is still the default"
    ERRORS=$((ERRORS + 1))
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
if [ ${ERRORS} -gt 0 ]; then
    echo "  FAILED: ${ERRORS} error(s) found. Fix before deploying."
    exit 1
else
    echo "  PASSED: All checks OK. Ready to deploy."
    exit 0
fi
