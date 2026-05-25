# ── CampusHub Backend Dockerfile ─────────────────────────────────────────────
# Multi-stage build: deps layer cached separately from source
FROM python:3.11-slim AS base

# Env flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ── Stage 1: Install Python dependencies ─────────────────────────────────────
FROM base AS deps

WORKDIR /app

# System deps needed for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime image ────────────────────────────────────────────────────
FROM base AS runtime

WORKDIR /app

# Runtime system deps only (no build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Create non-root user for security
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Create required directories with correct ownership
RUN mkdir -p /app/logs /app/media /app/staticfiles /app/static && \
    chown -R appuser:appgroup /app

# Copy project source
COPY --chown=appuser:appgroup . .

# Ensure entrypoint scripts are executable
RUN chmod +x /app/entrypoint.prod.sh 2>/dev/null || true

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Default command (overridden by docker-compose)
CMD ["gunicorn", "campushub.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
