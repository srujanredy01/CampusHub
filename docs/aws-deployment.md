# CampusHub — AWS EC2 Deployment Guide

## Prerequisites
- AWS account
- EC2 instance: **t3.medium** (2 vCPU, 4 GB RAM) minimum — t3.large recommended
- OS: **Ubuntu 22.04 LTS**
- Security Group ports open: **22** (SSH), **80** (HTTP), **443** (HTTPS)
- A domain name (optional but recommended)

---

## Step 1 — Launch EC2 Instance

1. Go to AWS Console → EC2 → Launch Instance
2. Choose **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**
3. Instance type: **t3.medium**
4. Storage: **30 GB gp3**
5. Security Group — add inbound rules:
   - SSH: port 22 from your IP
   - HTTP: port 80 from 0.0.0.0/0
   - HTTPS: port 443 from 0.0.0.0/0
6. Create or select a key pair — download the `.pem` file
7. Launch the instance

---

## Step 2 — Connect to EC2

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## Step 3 — Install Docker & Docker Compose

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Step 4 — Clone the Project

```bash
sudo mkdir -p /opt/campushub
sudo chown ubuntu:ubuntu /opt/campushub
cd /opt/campushub

# Option A: Clone from Git
git clone https://github.com/YOUR_USERNAME/campushub.git .

# Option B: Upload via SCP from your Windows machine
# Run this on your Windows machine (PowerShell):
# scp -i your-key.pem -r C:\Users\ksruj\Downloads\CampusHub\* ubuntu@YOUR_EC2_IP:/opt/campushub/
```

---

## Step 5 — Configure Environment

```bash
cd /opt/campushub

# Copy the production env template
cp backend/.env.production backend/.env

# Edit with your real values
nano backend/.env
```

**Required values to change in `.env`:**

| Variable | What to set |
|----------|-------------|
| `SECRET_KEY` | Run: `python3 -c "import secrets; print(secrets.token_hex(50))"` |
| `ALLOWED_HOSTS` | Your EC2 public IP, e.g. `54.123.45.67,backend` |
| `DB_PASSWORD` | A strong password, e.g. `MyStr0ng!Pass` |
| `FRONTEND_URL` | `http://YOUR_EC2_PUBLIC_IP` |
| `CORS_ALLOWED_ORIGINS` | `http://YOUR_EC2_PUBLIC_IP` |
| `DEBUG` | `False` |

---

## Step 6 — Build and Start

```bash
cd /opt/campushub

# Build all images (takes 5-10 minutes first time)
docker compose -f docker-compose.prod.yml build --no-cache

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check all containers are running
docker compose -f docker-compose.prod.yml ps
```

---

## Step 7 — Verify Deployment

```bash
# Check backend logs
docker logs campushub_backend --tail=30

# Test health endpoint
curl http://localhost/health

# Test API
curl http://localhost/api/schema/

# Test frontend
curl -I http://localhost/
```

Open in browser: `http://YOUR_EC2_PUBLIC_IP`

**Admin login:**
- Student ID: `0000000`
- Password: `Admin@123`

---

## Step 8 — Fix Admin Student ID (if needed)

If the admin can't log in after a fresh deploy:

```bash
docker exec campushub_db psql -U campushub_user -d campushub \
  -c "UPDATE users SET student_id='0000000' WHERE email='admin@campushub.com';"
```

---

## Step 9 — (Optional) Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get certificate (replace with your domain)
sudo certbot certonly --standalone -d YOUR_DOMAIN.com -d www.YOUR_DOMAIN.com

# Copy certs to nginx ssl folder
sudo mkdir -p /opt/campushub/docker/nginx/ssl
sudo cp /etc/letsencrypt/live/YOUR_DOMAIN.com/fullchain.pem /opt/campushub/docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/YOUR_DOMAIN.com/privkey.pem /opt/campushub/docker/nginx/ssl/
sudo chown ubuntu:ubuntu /opt/campushub/docker/nginx/ssl/*

# Uncomment the HTTPS server block in docker/nginx/nginx.prod.conf
# Then restart nginx
docker compose -f docker-compose.prod.yml start nginx
```

---

## Useful Commands

```bash
# View all container status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Stop everything
docker compose -f docker-compose.prod.yml down

# Update after code changes
git pull
docker compose -f docker-compose.prod.yml build --no-cache backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend

# Run Django management commands
docker exec campushub_backend python manage.py migrate
docker exec campushub_backend python manage.py createsuperuser

# Database backup
docker exec campushub_db pg_dump -U campushub_user campushub > backup_$(date +%Y%m%d).sql
```

---

## Monitoring

| Service | URL |
|---------|-----|
| App | `http://YOUR_EC2_IP` |
| API Docs | `http://YOUR_EC2_IP/api/docs/` |
| Django Admin | `http://YOUR_EC2_IP/django-admin/` |
| Grafana | `http://YOUR_EC2_IP:3001` (admin / admin123) |

> Prometheus and Grafana ports are only accessible if you open port 3001 in your Security Group. Keep them closed in production or use SSH tunneling.

---

## Troubleshooting

**Login fails after deploy:**
```bash
docker exec campushub_db psql -U campushub_user -d campushub \
  -c "SELECT student_id, email, is_active FROM users WHERE role='admin';"
# If student_id is empty:
docker exec campushub_db psql -U campushub_user -d campushub \
  -c "UPDATE users SET student_id='0000000' WHERE email='admin@campushub.com';"
```

**Backend 400 Bad Request:**
- Check `ALLOWED_HOSTS` in `.env` includes your EC2 IP

**CORS errors in browser:**
- Check `CORS_ALLOWED_ORIGINS` in `.env` includes your EC2 IP with `http://`

**Container won't start:**
```bash
docker compose -f docker-compose.prod.yml logs SERVICE_NAME
```

**Out of disk space:**
```bash
docker system prune -f
docker volume prune -f
```
