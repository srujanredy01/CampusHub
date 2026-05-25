# CampusHub

A production-grade student academic platform built with Django, React, PostgreSQL, and Docker — deployed on AWS EC2 via GitHub Actions.

---

## Architecture

```
Developer machine
      │
      │  git push
      ▼
   GitHub
      │
      │  GitHub Actions triggers automatically
      ▼
 GitHub Actions CI/CD
      │
      │  SSH into EC2
      ▼
  AWS EC2 Instance
      │
      │  git pull + docker compose up --build -d
      ▼
  Docker Compose
      │
      ├── nginx          (reverse proxy, port 80)
      ├── backend        (Django + Gunicorn, port 8000)
      ├── frontend       (React + Vite, port 3000)
      ├── db             (PostgreSQL)
      ├── executor       (code sandbox)
      ├── prometheus     (metrics)
      └── grafana        (dashboards)
```

---

## Local Development

### Prerequisites
- Docker Desktop
- Git

### Run locally

```bash
git clone https://github.com/YOUR_USERNAME/campushub.git
cd campushub

# Start all services
docker compose up --build -d

# Check status
docker compose ps
```

| URL | Service |
|-----|---------|
| http://localhost | React app |
| http://localhost/api/docs/ | Swagger API docs |
| http://localhost/django-admin/ | Django admin |
| http://localhost:9090 | Prometheus |
| http://localhost:3001 | Grafana (admin / admin123) |

**Admin login:** Student ID `0000000` / Password `Admin@123`

---

## Production Deployment (AWS EC2)

### One-time EC2 setup

```bash
# 1. SSH into your EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 2. Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# 3. Clone the repo
sudo mkdir -p /opt/campushub
sudo chown ubuntu:ubuntu /opt/campushub
cd /opt/campushub
git clone https://github.com/YOUR_USERNAME/campushub.git .

# 4. Configure environment
cp backend/.env.example backend/.env
nano backend/.env   # fill in SECRET_KEY, DB_PASSWORD, ALLOWED_HOSTS, etc.

# 5. First deploy
docker compose -f docker-compose.prod.yml up --build -d
```

### GitHub Actions auto-deploy

Every `git push` to `main` automatically deploys to EC2.

#### Required GitHub Secrets

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|-------|
| `EC2_HOST` | Your EC2 public IP, e.g. `54.123.45.67` |
| `EC2_USER` | `ubuntu` (or `ec2-user` for Amazon Linux) |
| `EC2_SSH_KEY` | Contents of your `.pem` private key file |
| `EC2_PORT` | `22` (optional, defaults to 22) |

#### How to add EC2_SSH_KEY

```bash
# On your local machine, copy the key contents:
cat your-key.pem
# Paste the entire output (including -----BEGIN/END----- lines) as the secret value
```

#### Deployment flow

```
git push origin main
        ↓
GitHub Actions (.github/workflows/deploy.yml)
        ↓
SSH into EC2 → cd /opt/campushub
        ↓
git pull origin main
        ↓
docker compose down
        ↓
docker image prune -f
        ↓
docker compose up --build -d
        ↓
Health check → verify all containers running
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description |
|----------|-------------|
| `SECRET_KEY` | Django secret key (generate with `python -c "import secrets; print(secrets.token_hex(50))"`) |
| `DEBUG` | `False` in production |
| `ALLOWED_HOSTS` | Your EC2 IP + domain, e.g. `54.123.45.67,backend` |
| `DB_PASSWORD` | Strong PostgreSQL password |
| `FRONTEND_URL` | `http://YOUR_EC2_IP` |
| `CORS_ALLOWED_ORIGINS` | `http://YOUR_EC2_IP` |
| `CORS_ALLOW_ALL_ORIGINS` | `True` (or `False` with explicit origins) |

---

## Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f nginx

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Run Django management commands
docker exec campushub_backend python manage.py migrate
docker exec campushub_backend python manage.py create_admin --noinput

# Fix admin login (if student_id is missing)
docker exec campushub_db psql -U campushub_user -d campushub \
  -c "UPDATE users SET student_id='0000000' WHERE email='admin@campushub.com';"

# Clean up old logs (keep last 90 days)
docker exec campushub_backend python manage.py cleanup_logs --days 90

# Database backup
docker exec campushub_db pg_dump -U campushub_user campushub > backup_$(date +%Y%m%d).sql

# Full restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up --build -d
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Redux Toolkit |
| Backend | Django 4.2, Django REST Framework |
| Database | PostgreSQL 15 |
| Code Execution | FastAPI sandbox (Docker-in-Docker) |
| Reverse Proxy | Nginx |
| Monitoring | Prometheus + Grafana |
| CI/CD | GitHub Actions |
| Hosting | AWS EC2 |
| Containers | Docker + Docker Compose |
