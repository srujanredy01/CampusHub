"""
RBAC Enforcement Middleware for CampusHub.

This middleware provides an additional layer of server-side permission enforcement.
It maps API path prefixes to required permissions and blocks unauthorized access
BEFORE the request reaches the view.

This is defense-in-depth — views still have their own permission_classes,
but this middleware catches any misconfigured views.
"""
import logging
from django.http import JsonResponse
from apps.accounts.rbac import get_user_permissions

logger = logging.getLogger(__name__)

# ── API Path → Required Permissions Mapping ───────────────────────────────────
# If a user doesn't have at least one of the listed permissions, they get 403.
# Paths are checked with startswith(), so order matters (most specific first).

API_PERMISSION_MAP = [
    # ── Student-only APIs ─────────────────────────────────────────────────────
    ("/api/coding/", ["view_coding"]),
    ("/api/contests/", ["view_contests"]),
    ("/api/leaderboard/", ["view_leaderboard"]),
    ("/api/roadmaps/", ["view_roadmaps", "moderate_roadmaps"]),
    ("/api/resume/", ["view_resume"]),
    ("/api/placement/", ["view_placement", "manage_placement"]),
    ("/api/cgpa/", ["view_cgpa", "admin_academic_overview"]),
    ("/api/attendance/", ["view_attendance", "manage_attendance"]),
    ("/api/assignments/", ["view_assignments", "create_assignments"]),
    ("/api/resources/", ["view_resources", "manage_resources", "faculty_view_resources"]),
    ("/api/notes/", ["view_notes", "moderate_notes", "verify_notes", "manage_resources"]),
    ("/api/saved/", ["view_saved"]),
    ("/api/lost-found/", ["view_lost_found"]),
    ("/api/groups/", ["view_groups", "moderate_groups", "faculty_view_groups"]),
    ("/api/communication/", ["view_communication", "moderate_chat", "manage_communication", "faculty_view_communication"]),
    ("/api/events/", ["view_events", "manage_events", "faculty_view_events"]),
    ("/api/news/", ["view_news", "manage_news", "create_announcements"]),

    # ── Faculty APIs ──────────────────────────────────────────────────────────
    ("/api/faculty/", ["manage_students", "manage_attendance", "grade_assignments", "create_assignments", "view_faculty_analytics"]),

    # ── Moderator APIs ────────────────────────────────────────────────────────
    ("/api/moderation/", ["view_reports", "moderate_channels", "moderate_notes", "moderate_roadmaps", "moderate_groups", "moderate_chat"]),

    # ── Admin APIs ────────────────────────────────────────────────────────────
    ("/api/admin/", ["manage_users", "manage_roles", "view_audit_logs", "view_admin_analytics", "manage_server"]),
]

# Paths that are always allowed (no permission check needed)
EXEMPT_PATHS = (
    "/api/auth/",
    "/api/profile/",
    "/api/notifications/",
    "/api/settings/",
    "/api/search/",
    "/api/feedback/",
    "/api/health",
    "/api/schema",
    "/api/docs",
)


class RBACEnforcementMiddleware:
    """
    Server-side RBAC enforcement middleware.
    Blocks API access for users who lack the required permissions.
    This is a safety net — views should also enforce their own permissions.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path

        # Only enforce on API paths
        if not path.startswith("/api/"):
            return self.get_response(request)

        # Skip exempt paths
        if any(path.startswith(exempt) for exempt in EXEMPT_PATHS):
            return self.get_response(request)

        # Skip if user is not authenticated (let DRF handle 401)
        if not hasattr(request, "user") or not request.user.is_authenticated:
            return self.get_response(request)

        # Super admin bypasses all checks
        if request.user.role == "super_admin":
            return self.get_response(request)

        # Check permissions for the path
        user_permissions = get_user_permissions(request.user)

        for api_path, required_perms in API_PERMISSION_MAP:
            if path.startswith(api_path):
                # User needs at least ONE of the required permissions
                if not any(perm in user_permissions for perm in required_perms):
                    logger.warning(
                        "RBAC blocked: user=%s role=%s path=%s required=%s",
                        request.user.email, request.user.role, path, required_perms,
                    )

                    # Log the access denial for audit
                    try:
                        from apps.audit.utils import log_activity
                        log_activity(
                            request,
                            action="access_denied",
                            status="failed",
                            metadata={
                                "path": path,
                                "method": request.method,
                                "required_permissions": required_perms,
                                "user_role": request.user.role,
                            },
                        )
                    except Exception:
                        pass

                    return JsonResponse(
                        {
                            "success": False,
                            "error": {
                                "message": "You do not have permission to access this module.",
                                "code": "PERMISSION_DENIED",
                            },
                        },
                        status=403,
                    )
                break  # Found matching path, no need to check further

        return self.get_response(request)
