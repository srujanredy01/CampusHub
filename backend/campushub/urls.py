from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
import logging

logger = logging.getLogger(__name__)


def health_check(request):
    """Deep health check — probes DB."""
    checks = {}
    overall = "ok"

    # Database probe
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        logger.error("Health check DB failed: %s", e)
        checks["database"] = "error"
        overall = "degraded"

    status_code = 200 if overall == "ok" else 503
    return JsonResponse(
        {"status": overall, "service": "campushub-backend", "checks": checks},
        status=status_code,
    )


urlpatterns = [
    path("api/health/",        health_check,                                        name="health-check"),
    # Also support without trailing slash for Docker health checks
    path("api/health",         health_check,                                        name="health-check-no-slash"),
    path("django-admin/",      admin.site.urls),

    # ── Existing APIs ──────────────────────────────────────────────────────
    path("api/auth/",          include("apps.accounts.urls")),
    path("api/profile/",       include("apps.profiles.urls")),
    path("api/resources/",     include("apps.resources.urls")),
    path("api/news/",          include("apps.news.urls")),
    path("api/questions/",     include("apps.coding.urls")),
    path("api/code/",          include("apps.coding.executor_urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/admin/",         include("apps.admin_dashboard.urls")),

    # ── New module APIs ────────────────────────────────────────────────────
    path("api/notes/",         include("apps.notes.urls")),
    path("api/cgpa/",          include("apps.cgpa.urls")),
    path("api/groups/",        include("apps.study_groups.urls")),
    path("api/placement/",     include("apps.placement.urls")),
    path("api/attendance/",    include("apps.attendance.urls")),

    # ── Docs & Metrics ─────────────────────────────────────────────────────
    path("api/schema/",        SpectacularAPIView.as_view(),                        name="schema"),
    path("api/docs/",          SpectacularSwaggerView.as_view(url_name="schema"),   name="swagger-ui"),
    path("metrics/",           include("django_prometheus.urls")),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
