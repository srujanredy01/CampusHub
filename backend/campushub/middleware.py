"""
CampusHub Middleware.

1. RequestIDMiddleware — attaches a unique request ID to every request/response.
2. ActivityTrackingMiddleware — logs API requests for authenticated users.
3. SecurityHeadersMiddleware — adds extra security headers not covered by Django defaults.
"""
import uuid
import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Bounded thread pool for activity logging — prevents unbounded thread creation under load
_LOG_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="activity-log")

# Paths to skip — no value in logging these
_SKIP_PREFIXES = (
    "/static/",
    "/media/",
    "/metrics/",
    "/health",
    "/favicon",
    "/api/schema",
    "/api/docs",
    "/django-admin/",
)

# Map API path prefixes to action names
_ACTION_MAP = {
    "/api/auth/login":          "login",
    "/api/auth/signup":         "signup",
    "/api/auth/logout":         "logout",
    "/api/auth/forgot-password":"password_reset_request",
    "/api/auth/reset-password": "password_reset_done",
    "/api/auth/change-password":"password_change",
    "/api/auth/me":             "profile_view",
    "/api/profile/":            "profile_view",
    "/api/resources/":          "resource_view",
    "/api/news/save":           "news_save",
    "/api/news/":               "news_view",
    "/api/questions/save":      "question_save",
    "/api/questions/":          "question_view",
    "/api/code/run":            "code_run",
    "/api/code/submit":         "code_submit",
    "/api/notifications/":      "notification_view",
    "/api/admin/":              "admin_action",
    "/api/notes/":              "resource_view",
    "/api/cgpa/":               "page_visit",
    "/api/groups/":             "page_visit",
    "/api/placement/":          "page_visit",
    "/api/attendance/":         "page_visit",
    "/api/communication/":      "page_visit",
    "/api/events/":             "page_visit",
}


def _resolve_action(path):
    for prefix, action in _ACTION_MAP.items():
        if path.startswith(prefix):
            return action
    return "api_request"


class RequestIDMiddleware:
    """
    Attaches a unique X-Request-ID header to every request and response.
    Useful for correlating logs across services.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        request.request_id = request_id
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response


class ActivityTrackingMiddleware:
    """
    Logs user activity for every authenticated API request.
    Runs asynchronously in a background thread to avoid adding latency.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only track API calls, skip noise
        path = request.path
        if any(path.startswith(p) for p in _SKIP_PREFIXES):
            return response

        if not path.startswith("/api/"):
            return response

        sc = response.status_code

        # For auth endpoints, track even unauthenticated requests (login failures)
        is_auth_endpoint = path.startswith("/api/auth/login") or path.startswith("/api/auth/signup")

        # Only track authenticated users for non-auth endpoints
        if not is_auth_endpoint:
            if not hasattr(request, "user") or not request.user.is_authenticated:
                return response

        # Skip 4xx client errors except 401/403 (those are interesting for security)
        if 400 <= sc < 500 and sc not in (401, 403):
            # But still track failed logins (400 from login endpoint)
            if not is_auth_endpoint:
                return response

        # Fire-and-forget in bounded thread pool
        _LOG_EXECUTOR.submit(self._log, request, path, sc)

        return response

    def _log(self, request, path, status_code):
        try:
            from apps.audit.utils import log_activity
            action = _resolve_action(path)
            status = "success" if status_code < 400 else "failed"
            log_activity(
                request,
                action=action,
                status=status,
                status_code=status_code,
                metadata={"path": path, "method": request.method},
            )
        except Exception as e:
            logger.debug("ActivityTrackingMiddleware log failed: %s", e)


class SecurityHeadersMiddleware:
    """
    Adds security headers not covered by Django's SecurityMiddleware.
    These headers provide defense-in-depth against common web attacks.
    Only adds headers that are not already set by Django's built-in middleware.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        # Only set headers if not already present (avoid overriding Django's SecurityMiddleware)
        response.setdefault("X-Content-Type-Options", "nosniff")
        response.setdefault("X-Frame-Options", "DENY")
        response.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        # Prevent caching of authenticated API responses
        if request.path.startswith("/api/") and request.path != "/api/health/":
            response["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response["Pragma"] = "no-cache"
        return response
