"""
RBAC permissions for Faculty Dashboard.
"""
from rest_framework.permissions import BasePermission


class IsFaculty(BasePermission):
    """Allow access only to faculty users."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == "faculty"
        )


class IsFacultyOrAdmin(BasePermission):
    """Allow access to faculty, admin, or super_admin."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ("faculty", "admin", "super_admin")
        )


class IsPlacementCoordinator(BasePermission):
    """Allow access only to placement coordinators."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ("admin", "super_admin"):
            return True
        if request.user.role == "faculty":
            profile = getattr(request.user, "faculty_profile", None)
            return profile and profile.is_placement_coordinator
        return False


class CanManageSection(BasePermission):
    """Faculty can only manage students in their assigned sections."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role in ("admin", "super_admin"):
            return True
        if request.user.role != "faculty":
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.user.role in ("admin", "super_admin"):
            return True
        profile = getattr(request.user, "faculty_profile", None)
        if not profile:
            return False
        # Check if the object's section/branch is in faculty's assigned scope
        obj_section = getattr(obj, "section", "")
        obj_branch = getattr(obj, "branch", "")
        if obj_section and profile.sections_assigned:
            if obj_section not in profile.sections_assigned:
                return False
        if obj_branch and profile.branches_assigned:
            if obj_branch not in profile.branches_assigned:
                return False
        return True
