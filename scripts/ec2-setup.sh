#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  CampusHub — EC2 Server Initial Setup Script
#  Run this ONCE on a fresh Ubuntu 22.04/24.04 EC2 instance.
#
#  Usage:
#    chmod +x scripts/ec2-setup.sh
#    sudo ./scripts/ec2-setup.sh
#
#  After running this script:
#    1. Edit /opt/campushub/backend/.env with your production values
#    2. Run: cd /opt/campushub && docker compose -f docker-compose.prod.yml --env-file ./backend/.env up -d --build
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "======================================"
echo "  CampusHub EC2 Setup"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"

# ── 1. System Update ─────────────────────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    unzip \
    htop \
    ufw \
    fail2ban

# ── 2. Install Docker ────────────────────────────────────────────────────────
echo "[2/8] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    # Add ubuntu user to docker group
    usermod -aG docker ubuntu
    echo "  Docker installed: $(docker --version)"
else
    echo "  Docker already installed: $(docker --version)"
fi

# ── 3. Install Docker Compose (v2 plugin) ────────────────────────────────────
echo "[3/8] Verifying Docker Compose..."
if docker compose version &> /dev/null; then
    echo "  Docker Compose available: $(docker compose version)"
else
    echo "  Installing Docker Compose plugin..."
    apt-get install -y docker-compose-plugin
    echo "  Docker Compose installed: $(docker compose version)"
fi

# ── 4. Configure Swap (2GB — helps on t2.micro/t3.micro) ─────────────────────
echo "[4/8] Configuring swap..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Optimize swap usage
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "  2GB swap configured"
else
    echo "  Swap already configured"
fi

# ── 5. Configure Firewall (UFW) ──────────────────────────────────────────────
echo "[5/8] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "  Firewall configured (SSH, HTTP, HTTPS allowed)"

# ── 6. Configure Fail2Ban ────────────────────────────────────────────────────
echo "[6/8] Configuring Fail2Ban..."
systemctl enable fail2ban
systemctl start fail2ban
echo "  Fail2Ban enabled"

# ── 7. Create Project Directory ──────────────────────────────────────────────
echo "[7/8] Setting up project directory..."
PROJECT_DIR="/opt/campushub"
BACKUP_DIR="/opt/campushub/backups"

mkdir -p "${PROJECT_DIR}"
mkdir -p "${BACKUP_DIR}"
mkdir -p "${PROJECT_DIR}/backend/logs"
mkdir -p "${PROJECT_DIR}/docker/nginx/ssl"

# Clone or update repo
if [ -d "${PROJECT_DIR}/.git" ]; then
    echo "  Project already cloned, pulling latest..."
    cd "${PROJECT_DIR}"
    git pull origin main
else
    echo "  Cloning CampusHub repository..."
    echo "  NOTE: You need to set up the git remote manually:"
    echo "    cd ${PROJECT_DIR}"
    echo "    git clone YOUR_REPO_URL ."
fi

# Set ownership
chown -R ubuntu:ubuntu "${PROJECT_DIR}"

# ── 8. Create Production .env Template ───────────────────────────────────────
echo "[8/8] Setting up environment file..."
ENV_FILE="${PROJECT_DIR}/backend/.env"
if [ ! -f "${ENV_FILE}" ]; then
    if [ -f "${PROJECT_DIR}/backend/.env.production" ]; then
        cp "${PROJECT_DIR}/backend/.env.production" "${ENV_FILE}"
        echo "  Created ${ENV_FILE} from template"
        echo "  *** IMPORTANT: Edit ${ENV_FILE} with your production values! ***"
    else
        echo "  WARNING: No .env.production template found"
        echo "  You must create ${ENV_FILE} manually"
    fi
else
    echo "  ${ENV_FILE} already exists"
fi

echo ""
echo "======================================"
echo "  EC2 Setup Complete!"
echo "======================================"
echo ""
echo "  Next steps:"
echo "  1. Clone your repo:  cd /opt/campushub && git clone YOUR_REPO_URL ."
echo "  2. Edit .env:        nano /opt/campushub/backend/.env"
echo "  3. Deploy:           cd /opt/campushub && docker compose -f docker-compose.prod.yml --env-file ./backend/.env up -d --build"
echo ""
echo "  Required .env changes:"
echo "    - SECRET_KEY (generate with: python3 -c \"import secrets; print(secrets.token_hex(50))\")"
echo "    - DB_PASSWORD (strong password)"
echo "    - ALLOWED_HOSTS (your Elastic IP)"
echo "    - CORS_ALLOWED_ORIGINS (http://YOUR_ELASTIC_IP)"
echo "    - CSRF_TRUSTED_ORIGINS (http://YOUR_ELASTIC_IP)"
echo "    - FRONTEND_URL (http://YOUR_ELASTIC_IP)"
echo "    - ADMIN_PASSWORD (strong password)"
echo ""
echo "  Verify deployment:"
echo "    docker compose -f docker-compose.prod.yml ps"
echo "    curl http://localhost/api/health/"
echo "    curl http://localhost/health"
echo ""
