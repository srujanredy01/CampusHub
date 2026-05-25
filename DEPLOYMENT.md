# CampusHub — AWS EC2 Production Deployment Guide

## Prerequisites
- AWS EC2 instance (Ubuntu 22.04 recommended, t3.medium or larger)
- Docker & Docker Compose installed
- Git installed
- Security group: ports 80 (HTTP), 22 (SSH) open

## Quick Deploy (5 minutes)

```bash
# 1. Clone the repository
cd /opt
sudo git clone https://github.com/YOUR_REPO/CampusHub.git campushub
cd campushub

# 2. Configure environment
cp backend/.env.production backend/.env
nano backend/.env
# Fill in: SECRET_KEY, ADMIN_PASSWORD, your EC2 IP in ALLOWED_HOSTS,
# CORS_ALLOWED_ORIGINS, CSRF_TRUSTED_ORIGINS

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verify
docker compose -f docker-compose.prod.yml ps
curl http://localhost/api/health/
```

## Environment Configuration

Edit `backend/.env` with your production values:

```env
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(50))">
DEBUG=False
ALLOWED_HOSTS=YOUR_EC2_IP,YOUR_DOMAIN.com,backend,localhost

CORS_ALLOWED_ORIGINS=http://YOUR_EC2_IP,https://YOUR_DOMAIN.com
CSRF_TRUSTED_ORIGINS=http://YOUR_EC2_IP,https://YOUR_DOMAIN.com
ADMIN_PASSWORD=<strong password>
```

## Architecture

```
Internet → :80 Nginx → /api/*        → Django (backend:8000)
                      → /static/*     → Volume (collectstatic)
                      → /media/*      → Volume (uploads)
                      → /django-admin → Django admin
                      → /*            → Frontend (static HTML/CSS/JS on :3000)
```

## Services

| Service    | Container              | Port | Description                    |
|-----------|------------------------|------|--------------------------------|
| nginx     | campushub_nginx        | 80   | Reverse proxy                  |
| backend   | campushub_backend      | 8000 | Django REST API                |
| frontend  | campushub_frontend     | 3000 | Static HTML/CSS/JS             |
| db        | campushub_db           | 5432 | PostgreSQL 15                  |
| executor  | campushub_executor     | 8001 | Code execution sandbox         |

## Working URLs

- `http://EC2_IP/` — Frontend (login page)
- `http://EC2_IP/api/health/` — Health check
- `http://EC2_IP/api/docs/` — API documentation (Swagger)
- `http://EC2_IP/django-admin/` — Django admin panel
- `http://EC2_IP/admin/` — Redirects to Django admin

## Default Admin Credentials

- Student ID: `0000000`
- Password: Value of `ADMIN_PASSWORD` in .env (default: `Admin@123`)

## Monitoring (Optional)

```bash
docker compose -f docker-compose.prod.yml -f docker-compose.monitoring.yml up -d --build
# Grafana: ssh -L 3001:localhost:3001 user@EC2_IP
# Then open http://localhost:3001
```

## Troubleshooting

```bash
# View logs
docker logs campushub_backend --tail=50
docker logs campushub_nginx --tail=50

# Restart a service
docker compose -f docker-compose.prod.yml restart backend

# Run migrations manually
docker exec campushub_backend python manage.py migrate

# Create superuser manually
docker exec -it campushub_backend python manage.py createsuperuser

# Check database connectivity
docker exec campushub_backend python manage.py check --database default
```

## SSL/HTTPS Setup

1. Install certbot on EC2
2. Obtain certificate for your domain
3. Uncomment HTTPS block in `docker/nginx/nginx.prod.conf`
4. Mount certificates as volumes in docker-compose
5. Uncomment `SECURE_PROXY_SSL_HEADER` in settings.py
