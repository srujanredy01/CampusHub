# CampusHub — AWS EC2 Production Deployment Guide

## Architecture

```
Internet → :80 Nginx ─┬─ /api/*        → Django Backend (Gunicorn :8000)
                      ├─ /ws/*         → Django Channels (WebSocket)
                      ├─ /static/*     → Volume (collectstatic)
                      ├─ /media/*      → Volume (uploads / S3)
                      ├─ /django-admin → Django Admin
                      └─ /*            → React Frontend (Nginx :3000)

Backend → PostgreSQL (db:5432)
       → Redis (redis:6379) — Cache + Channel Layer + Celery Broker
       → Celery Worker — Async tasks (emails, stats)
       → Executor Service (executor:8001) — Code sandbox
       → AWS S3 (optional) — File storage
```

## Services (8 containers)

| Service      | Container              | Port | Description                    |
|-------------|------------------------|------|--------------------------------|
| nginx       | campushub_nginx        | 80   | Reverse proxy + SSL termination|
| backend     | campushub_backend      | 8000 | Django REST API + Gunicorn     |
| frontend    | campushub_frontend     | 3000 | React (Vite build) + Nginx     |
| db          | campushub_db           | 5432 | PostgreSQL 15                  |
| redis       | campushub_redis        | 6379 | Cache + Celery broker          |
| celery      | campushub_celery       | —    | Async task worker              |
| celery-beat | campushub_celery_beat  | —    | Periodic task scheduler        |
| executor    | campushub_executor     | 8001 | Code execution sandbox         |

## Quick Deploy

```bash
# 1. SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# 2. Run setup script (first time only)
sudo bash /opt/campushub/scripts/ec2-setup.sh

# 3. Clone repo
cd /opt/campushub
git clone https://github.com/YOUR_USER/CampusHub.git .

# 4. Configure environment
cp backend/.env.production backend/.env
nano backend/.env  # Fill in real values

# 5. Deploy
docker compose -f docker-compose.prod.yml up -d --build

# 6. Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost/api/health/
```

## Required .env Values

```env
SECRET_KEY=<python -c "import secrets; print(secrets.token_hex(50))">
DEBUG=False
ALLOWED_HOSTS=YOUR_EC2_IP,your-domain.com,backend,localhost
DB_PASSWORD=<strong password>
CORS_ALLOWED_ORIGINS=http://YOUR_EC2_IP
CSRF_TRUSTED_ORIGINS=http://YOUR_EC2_IP
FRONTEND_URL=http://YOUR_EC2_IP
ADMIN_PASSWORD=<strong password>
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/2
```

## Working URLs

- `http://EC2_IP/` — React frontend
- `http://EC2_IP/login` — Login page
- `http://EC2_IP/api/health/` — Health check
- `http://EC2_IP/api/docs/` — Swagger API docs
- `http://EC2_IP/django-admin/` — Django admin
- `http://EC2_IP/admin/` → redirects to Django admin

## Default Admin

- Student ID: `0000000`
- Password: value of `ADMIN_PASSWORD` in .env

## Monitoring (Optional)

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d --build
# Grafana: ssh -L 3001:localhost:3001 ubuntu@EC2_IP → http://localhost:3001
```

## Troubleshooting

```bash
docker logs campushub_backend --tail=50
docker logs campushub_frontend --tail=20
docker logs campushub_celery --tail=20
docker exec campushub_backend python manage.py check
docker exec campushub_backend python manage.py migrate --check
```
