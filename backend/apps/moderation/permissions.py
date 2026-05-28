"""
RBAC permissions for Moderation Dashboard.
"""
from rest_framework.permissions import BasePermission


class IsModerator(BasePermission):
    """Allow access only to moderators."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("moderator", "admin", "super_admin")
        )


class IsGlobalModerator(BasePermission):
    """Allow access only to global moderators or admins."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ("admin", "super_admin"):
            return True
        if request.user.role == "moderator":
            profile = getattr(request.user, "moderator_profile", None)
            return profile and profile.scope == "global"
        return False


class CanModerateContent(BasePermission):
    """Check if moderator has permission for specific content type."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ("admin", "super_admin"):
            return True
        if request.user.role != "moderator":
            return False
        return True


class ScopedModerator(BasePermission):
    """
    Enforce section/department scope for moderators.
    Section moderators can only moderate their section.
    Department moderators can only moderate their department.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ("admin", "super_admin"):
            return True
        if request.user.role != "moderator":
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.role in ("admin", "super_admin"):
            return True

        profile = getattr(request.user, "moderator_profile", None)
        if not profile:
            return False

        if profile.scope == "global":
            return True

        if profile.scope == "section":
            obj_section = getattr(obj, "section", "") or getattr(obj, "target_section", "")
            obj_branch = getattr(obj, "branch", "") or getattr(obj, "target_branch", "")
            if obj_section and profile.section and obj_section != profile.section:
                return False
            if obj_branch and profile.branch and obj_branch != profile.branch:
                return False

        if profile.scope == "department":
            obj_dept = getattr(obj, "department", "") or getattr(obj, "branch", "")
            if obj_dept and profile.department and obj_dept != profile.department:
                return False

        return True
