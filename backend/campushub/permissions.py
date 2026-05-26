"""
CampusHub Role-Based Access Control (RBAC) Permissions.
Roles: super_admin, admin, faculty, student, moderator
"""
from rest_framework.permissions import BasePermission


class IsSuperAdmin(BasePermission):
    message = "Super Admin access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "super_admin"
        )


class IsAdmin(BasePermission):
    """Allows super_admin and admin roles."""
    message = "Admin access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("admin", "super_admin")
        )


class IsFaculty(BasePermission):
    message = "Faculty access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "faculty"
        )


class IsFacultyOrAdmin(BasePermission):
    """Allows faculty, admin, and super_admin roles."""
    message = "Faculty or Admin access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("faculty", "admin", "super_admin")
        )


class IsStudent(BasePermission):
    message = "Student access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )


class IsModerator(BasePermission):
    message = "Moderator access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "moderator"
        )


class IsModeratorOrAdmin(BasePermission):
    """Allows moderator, admin, and super_admin roles."""
    message = "Moderator or Admin access required."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in ("moderator", "admin", "super_admin")
        )


class IsAdminOrReadOnly(BasePermission):
    """Admin/super_admin can write; authenticated users can read."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role in ("admin", "super_admin")


class IsFacultyOrAdminOrReadOnly(BasePermission):
    """Faculty/admin/super_admin can write; authenticated users can read."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return request.user.role in ("faculty", "admin", "super_admin")


class IsOwnerOrAdmin(BasePermission):
    """Object owner or admin can access."""

    def has_object_permission(self, request, view, obj):
        if request.user.role in ("admin", "super_admin"):
            return True
        if hasattr(obj, "user"):
            return obj.user == request.user
        if hasattr(obj, "student"):
            return obj.student == request.user
        if hasattr(obj, "posted_by"):
            return obj.posted_by == request.user
        if hasattr(obj, "created_by"):
            return obj.created_by == request.user
        return False


class HasRole(BasePermission):
    """
    Generic role checker. Use by setting `required_roles` on the view.
    Example:
        class MyView(APIView):
            permission_classes = [IsAuthenticated, HasRole]
            required_roles = ['admin', 'faculty']
    """
    message = "You do not have the required role for this action."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        required_roles = getattr(view, "required_roles", [])
        if not required_roles:
            return True
        return request.user.role in required_roles
