"""
Dynamic RBAC API Views.
Serves permission configuration to the frontend so dashboards
render dynamically based on backend role/permission state.
"""
import logging
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from campushub.permissions import IsAdmin, IsSuperAdmin
from .rbac import (
    get_dashboard_config,
    get_user_permissions,
    ROLE_PERMISSIONS,
    PERMISSIONS,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class DashboardConfigView(APIView):
    """
    GET /api/auth/dashboard-config
    Returns the complete dynamic dashboard configuration for the current user.
    Frontend uses this to render sidebar, widgets, routes, and permissions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = get_dashboard_config(request.user)
        return Response({
            "success": True,
            "data": config,
        })


class PermissionSyncView(APIView):
    """
    GET /api/auth/permissions
    Lightweight endpoint for permission refresh (called on token refresh).
    Returns only permissions and role — used for quick sync without full config.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "success": True,
            "data": {
                "role": request.user.role,
                "permissions": get_user_permissions(request.user),
            },
        })


class RoleUpdateView(APIView):
    """
    POST /api/admin/users/<uuid:pk>/role
    Admin/Super Admin changes a user's role.
    Triggers real-time WebSocket notification to the affected user.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            target_user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        new_role = request.data.get("role")
        if not new_role:
            return Response(
                {"success": False, "error": {"message": "Role is required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        valid_roles = [r[0] for r in User.ROLE_CHOICES]
        if new_role not in valid_roles:
            return Response(
                {"success": False, "error": {"message": f"Invalid role. Must be one of: {valid_roles}"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Only super_admin can assign admin/super_admin roles
        if new_role in ("admin", "super_admin") and request.user.role != "super_admin":
            return Response(
                {"success": False, "error": {"message": "Only Super Admin can assign admin roles."}},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Cannot change own role
        if target_user.id == request.user.id:
            return Response(
                {"success": False, "error": {"message": "Cannot change your own role."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_role = target_user.role
        if old_role == new_role:
            return Response(
                {"success": False, "error": {"message": "User already has this role."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update role
        target_user.role = new_role
        target_user.is_staff = new_role in ("faculty", "admin", "super_admin", "moderator")
        target_user.save(update_fields=["role", "is_staff", "updated_at"])

        # Log the role change
        try:
            from apps.audit.utils import log_activity
            log_activity(
                request,
                action="role_changed",
                metadata={
                    "target_user_id": str(target_user.id),
                    "target_user_email": target_user.email,
                    "old_role": old_role,
                    "new_role": new_role,
                },
            )
        except Exception:
            pass

        # Send real-time notification to the affected user via WebSocket
        self._notify_role_change(target_user, old_role, new_role, request.user)

        logger.info(
            "Role changed: %s (%s → %s) by %s",
            target_user.email, old_role, new_role, request.user.email,
        )

        return Response({
            "success": True,
            "message": f"Role updated from {old_role} to {new_role}.",
            "data": {
                "user_id": str(target_user.id),
                "old_role": old_role,
                "new_role": new_role,
            },
        })

    def _notify_role_change(self, user, old_role, new_role, changed_by):
        """Send WebSocket event to user about their role change."""
        try:
            channel_layer = get_channel_layer()
            group_name = f"user_notifications_{user.id}"

            # Send role_changed event
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "role.changed",
                    "data": {
                        "old_role": old_role,
                        "new_role": new_role,
                        "changed_by": changed_by.full_name,
                        "timestamp": timezone.now().isoformat(),
                        "message": f"Your role has been updated from {old_role} to {new_role}.",
                    },
                },
            )
        except Exception as e:
            logger.warning("Failed to send role change WebSocket notification: %s", e)

        # Also create a persistent notification
        try:
            from apps.notifications.models import Notification
            Notification.objects.create(
                user=user,
                notification_type="system",
                title="Role Updated",
                message=f"Your role has been changed from {old_role} to {new_role} by {changed_by.full_name}.",
                priority="high",
                metadata={
                    "old_role": old_role,
                    "new_role": new_role,
                    "action": "role_changed",
                },
            )
        except Exception as e:
            logger.warning("Failed to create role change notification: %s", e)


class PermissionUpdateView(APIView):
    """
    POST /api/admin/users/<uuid:pk>/permissions
    Super Admin grants/revokes specific permissions for a user.
    """
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def post(self, request, pk):
        try:
            target_user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "User not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        grant = request.data.get("grant", [])
        revoke = request.data.get("revoke", [])

        # Validate permission names
        all_perms = set(PERMISSIONS.keys())
        invalid_grant = [p for p in grant if p not in all_perms]
        invalid_revoke = [p for p in revoke if p not in all_perms]

        if invalid_grant or invalid_revoke:
            return Response(
                {"success": False, "error": {"message": f"Invalid permissions: {invalid_grant + invalid_revoke}"}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Store permission overrides in user's profile metadata
        # Using the StudentProfile or a dedicated field
        from apps.profiles.models import StudentProfile
        profile, _ = StudentProfile.objects.get_or_create(user=target_user)

        # Store in profile metadata (achievements field repurposed or use a JSONField)
        current_overrides = profile.achievements if isinstance(profile.achievements, dict) else {}
        if not isinstance(current_overrides, dict) or "permission_overrides" not in current_overrides:
            current_overrides = {"permission_overrides": {"grant": [], "revoke": []}}

        overrides = current_overrides.get("permission_overrides", {"grant": [], "revoke": []})

        # Apply changes
        for perm in grant:
            if perm not in overrides["grant"]:
                overrides["grant"].append(perm)
            if perm in overrides["revoke"]:
                overrides["revoke"].remove(perm)

        for perm in revoke:
            if perm not in overrides["revoke"]:
                overrides["revoke"].append(perm)
            if perm in overrides["grant"]:
                overrides["grant"].remove(perm)

        current_overrides["permission_overrides"] = overrides
        profile.achievements = current_overrides
        profile.save(update_fields=["achievements"])

        # Notify user of permission change
        self._notify_permission_change(target_user, grant, revoke, request.user)

        return Response({
            "success": True,
            "message": "Permissions updated.",
            "data": {
                "user_id": str(target_user.id),
                "granted": grant,
                "revoked": revoke,
            },
        })

    def _notify_permission_change(self, user, granted, revoked, changed_by):
        """Send WebSocket event about permission changes."""
        try:
            channel_layer = get_channel_layer()
            group_name = f"user_notifications_{user.id}"

            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "permissions.changed",
                    "data": {
                        "granted": granted,
                        "revoked": revoked,
                        "changed_by": changed_by.full_name,
                        "timestamp": timezone.now().isoformat(),
                        "message": "Your permissions have been updated. Refreshing dashboard.",
                    },
                },
            )
        except Exception as e:
            logger.warning("Failed to send permission change notification: %s", e)


class RoleListView(APIView):
    """
    GET /api/admin/roles
    Returns all available roles and their default permissions.
    Used by admin UI for role management.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        roles = []
        for role_code, role_label in User.ROLE_CHOICES:
            roles.append({
                "code": role_code,
                "label": role_label,
                "permissions": ROLE_PERMISSIONS.get(role_code, []),
                "permission_count": len(ROLE_PERMISSIONS.get(role_code, [])),
            })

        return Response({
            "success": True,
            "data": {
                "roles": roles,
                "all_permissions": [
                    {"code": code, "description": desc}
                    for code, desc in PERMISSIONS.items()
                ],
            },
        })
