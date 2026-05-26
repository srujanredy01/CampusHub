"""
CampusHub Django Settings — Production-ready, environment-based config.
"""
import os
import sys
from pathlib import Path
from datetime import timedelta
import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# Ensure logs directory exists before logging handlers try to open files
_LOGS_DIR = BASE_DIR / "logs"
_LOGS_DIR.mkdir(exist_ok=True)

SECRET_KEY = env("SECRET_KEY", default="django-insecure-dev-key-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# Warn loudly if running with the insecure default key in production
if SECRET_KEY == "django-insecure-dev-key-change-me" and not DEBUG:
    import warnings
    warnings.warn(
        "SECRET_KEY is set to the insecure default. Set a strong SECRET_KEY in your .env file.",
        RuntimeWarning,
    )

# Always allow the internal Docker service name and common EC2 patterns
# The env var ALLOWED_HOSTS should contain your EC2 IP / domain
_extra_hosts = ["backend", "localhost", "127.0.0.1", "0.0.0.0"]
for _h in _extra_hosts:
    if _h not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_h)

# Disable automatic slash appending — all URLs are defined without trailing slashes
APPEND_SLASH = False

DJANGO_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]
THIRD_PARTY_APPS = [
    "channels",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "storages",
    "django_filters",
    "drf_spectacular",
    "django_prometheus",
]
LOCAL_APPS = [
    "apps.accounts",
    "apps.profiles",
    "apps.resources",
    "apps.news",
    "apps.coding",
    "apps.contests",
    "apps.notifications",
    "apps.admin_dashboard",
    "apps.audit",
    "apps.notes",
    "apps.cgpa",
    "apps.study_groups",
    "apps.placement",
    "apps.attendance",
    "apps.roadmaps",
    "apps.resume",
    "apps.lost_found",
    "apps.assignments",
    "apps.leaderboard",
    "apps.search",
]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
    # Request ID — must be early so all subsequent middleware can use it
    "campushub.middleware.RequestIDMiddleware",
    # Activity tracking — must be after AuthenticationMiddleware
    "campushub.middleware.ActivityTrackingMiddleware",
    # Extra security headers
    "campushub.middleware.SecurityHeadersMiddleware",
]

ROOT_URLCONF = "campushub.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "campushub.wsgi.application"
ASGI_APPLICATION = "campushub.asgi.application"

# ── Channel Layers (WebSocket backend) ────────────────────────────────────────
REDIS_URL = env("REDIS_URL", default="redis://redis:6379/0")

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="campushub"),
        "USER": env("DB_USER", default="campushub_user"),
        "PASSWORD": env("DB_PASSWORD", default="campushub_pass"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
    }
}

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://redis:6379/1"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.db"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTH_USER_MODEL = "accounts.User"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [d for d in [BASE_DIR / "static"] if d.is_dir()]
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
        "rest_framework.parsers.FormParser",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "campushub.exceptions.custom_exception_handler",
    # ── Throttling ────────────────────────────────────────────────────────────
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon":        "60/minute",
        "user":        "300/minute",
        "login":       "10/minute",
        "signup":      "5/minute",
        "upload":      "20/hour",
        "code_run":    "30/minute",
        "code_submit": "20/minute",
    },
    # Number of proxies in front of Django (nginx) — ensures correct client IP for throttling
    "NUM_PROXIES": env.int("NUM_PROXIES", default=1),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost", "http://127.0.0.1"],
)
CORS_ALLOW_CREDENTIALS = True
# CORS_ALLOW_ALL_ORIGINS should be False by default; set to True only in dev via .env
CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=False)
# NOTE: Do NOT add a wildcard CORS_ALLOWED_ORIGIN_REGEXES — it defeats CORS protection.
# Add specific origins to CORS_ALLOWED_ORIGINS via the env var instead.
CORS_ALLOW_HEADERS = [
    "accept", "accept-encoding", "authorization", "content-type",
    "dnt", "origin", "user-agent", "x-csrftoken", "x-requested-with",
]

# ── CSRF ──────────────────────────────────────────────────────────────────────
# Required for Django admin behind nginx proxy (Django 4.x strict origin check)
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=["http://localhost", "http://127.0.0.1"],
)

USE_S3 = env.bool("USE_S3", default=False)
if USE_S3:
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = env("AWS_S3_REGION_NAME", default="us-east-1")
    AWS_S3_CUSTOM_DOMAIN = f"{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com"
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}
    AWS_DEFAULT_ACL = "private"
    AWS_S3_FILE_OVERWRITE = False
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = 3600
    STORAGES["default"] = {
        "BACKEND": "campushub.storage_backends.MediaStorage",
    }



EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="noreply@campushub.com")

FRONTEND_URL = env("FRONTEND_URL", default="http://localhost")
EXECUTOR_SERVICE_URL = env("EXECUTOR_SERVICE_URL", default="http://executor:8001")
EXECUTOR_TIMEOUT = env.int("EXECUTOR_TIMEOUT", default=10)
EXECUTOR_MEMORY_MB = env.int("EXECUTOR_MEMORY_MB", default=192)

# ── File Upload Security ──────────────────────────────────────────────────────
MAX_UPLOAD_SIZE_MB = env.int("MAX_UPLOAD_SIZE_MB", default=20)
MAX_UPLOAD_SIZE    = MAX_UPLOAD_SIZE_MB * 1024 * 1024  # bytes
ALLOWED_NOTE_EXTENSIONS  = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".gif"}
ALLOWED_RESOURCE_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE

# ── Cache TTLs (seconds) ──────────────────────────────────────────────────────
CACHE_TTL_SHORT  = 60 * 5    # 5 minutes
CACHE_TTL_MEDIUM = 60 * 15   # 15 minutes
CACHE_TTL_LONG   = 60 * 60   # 1 hour
CACHE_TTL_DAY    = 60 * 60 * 24  # 24 hours

# ── Environment Validation ────────────────────────────────────────────────────
_REQUIRED_IN_PRODUCTION = [
    "SECRET_KEY", "DB_PASSWORD", "ALLOWED_HOSTS",
]
if not DEBUG:
    _missing = [k for k in _REQUIRED_IN_PRODUCTION if not env(k, default="")]
    if _missing:
        import warnings
        warnings.warn(f"Missing recommended production env vars: {_missing}", RuntimeWarning)

SPECTACULAR_SETTINGS = {
    "TITLE": "CampusHub API",
    "DESCRIPTION": "Student Academic Platform API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {message}",
            "style": "{",
        },
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(levelname)s %(name)s %(module)s %(message)s %(pathname)s %(lineno)d",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if not DEBUG else "verbose",
            "stream": sys.stdout,
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "errors.log",
            "maxBytes": 10 * 1024 * 1024,  # 10 MB
            "backupCount": 5,
            "formatter": "json",
            "level": "ERROR",
        },
        "security_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": BASE_DIR / "logs" / "security.log",
            "maxBytes": 10 * 1024 * 1024,
            "backupCount": 5,
            "formatter": "json",
            "level": "WARNING",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": env("DJANGO_LOG_LEVEL", default="INFO"),
            "propagate": False,
        },
        "django.security": {
            "handlers": ["console", "security_file"],
            "level": "WARNING",
            "propagate": False,
        },
        "apps": {
            "handlers": ["console", "error_file"],
            "level": "DEBUG",
            "propagate": False,
        },
        "campushub": {
            "handlers": ["console", "error_file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    PERMISSIONS_POLICY = "geolocation=(), microphone=(), camera=()"
    # Only set SECURE_PROXY_SSL_HEADER if you have HTTPS configured.
    # On plain HTTP EC2, this causes Django to reject all requests.
    # Uncomment ONLY after SSL is set up:
    # SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    # SECURE_HSTS_SECONDS = 31536000
    # SECURE_HSTS_INCLUDE_SUBDOMAINS = True

    # Tighten CORS in production
    CORS_ALLOW_ALL_ORIGINS = False

# ── Celery Configuration ──────────────────────────────────────────────────────
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://redis:6379/2")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://redis:6379/3")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# Celery Beat schedule
CELERY_BEAT_SCHEDULE = {
    "update-leaderboard-ranks": {
        "task": "apps.coding.tasks.update_leaderboard_ranks",
        "schedule": 3600,  # Every hour
    },
}



