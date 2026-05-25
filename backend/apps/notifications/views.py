"""
Notification views for CampusHub.
Handles user notifications, admin alerts, and notification management.
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model

from campushub.permissions import IsAdmin
from .models import Notification, AdminAlert
from .serializers import NotificationSerializer, AdminAlertSerializer, AdminSendNotificationSerializer
from .services import create_user_notification, create_bulk_notifications

User = get_user_model()


class NotificationListView(APIView):
    """
    GET /api/notifications - Get user's notifications with filters.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = Notification.objects.filter(user=request.user)

        # Filters
        ntype = request.query_params.get("type")
        priority = request.query_params.get("priority")
        is_read = request.query_params.get("is_read")

        if ntype:
            queryset = queryset.filter(notification_type=ntype)
        if priority:
            queryset = queryset.filter(priority=priority)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")

        notifications = queryset.order_by("-created_at")[:100]
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        serializer = NotificationSerializer(notifications, many=True)

        return Response({
            "success": True,
            "data": {
                "notifications": serializer.data,
                "unread_count": unread_count,
            }
        })


class MarkReadView(APIView):
    """
    POST /api/notifications/mark-read - Mark notifications as read.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notification_ids = request.data.get("ids", [])
        if notification_ids:
            Notification.objects.filter(
                user=request.user,
                id__in=notification_ids,
            ).update(is_read=True)
        else:
            # Mark all as read
            Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)

        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({
            "success": True,
            "message": "Notifications marked as read.",
            "data": {"unread_count": unread_count},
        })


class NotificationDeleteView(APIView):
    """
    DELETE /api/notifications/<id> - Delete a notification.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = Notification.objects.filter(user=request.user, id=pk).delete()
        if not deleted:
            return Response(
                {"success": False, "error": {"message": "Notification not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "message": "Notification deleted."})


class NotificationUnreadCountView(APIView):
    """
    GET /api/notifications/unread-count - Get unread count only.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"success": True, "data": {"unread_count": count}})


# ─── Admin Alert Views ────────────────────────────────────────────────────────

class AdminAlertListView(APIView):
    """
    GET /api/admin/alerts - Get admin alerts with filters.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        queryset = AdminAlert.objects.select_related("user")

        # Filters
        category = request.query_params.get("category")
        alert_type = request.query_params.get("alert_type")
        is_read = request.query_params.get("is_read")

        if category:
            queryset = queryset.filter(category=category)
        if alert_type:
            queryset = queryset.filter(alert_type=alert_type)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == "true")

        # Pagination
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))
        start = (page - 1) * page_size
        end = start + page_size

        total = queryset.count()
        alerts = queryset.order_by("-created_at")[start:end]
        unread_count = AdminAlert.objects.filter(is_read=False).count()

        serializer = AdminAlertSerializer(alerts, many=True)

        return Response({
            "success": True,
            "data": {
                "alerts": serializer.data,
                "unread_count": unread_count,
                "total": total,
                "page": page,
                "page_size": page_size,
            }
        })


class AdminAlertMarkReadView(APIView):
    """
    POST /api/admin/alerts/mark-read - Mark admin alerts as read.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        alert_ids = request.data.get("ids", [])
        if alert_ids:
            AdminAlert.objects.filter(id__in=alert_ids).update(is_read=True)
        else:
            AdminAlert.objects.filter(is_read=False).update(is_read=True)

        unread_count = AdminAlert.objects.filter(is_read=False).count()
        return Response({
            "success": True,
            "message": "Alerts marked as read.",
            "data": {"unread_count": unread_count},
        })


class AdminAlertDeleteView(APIView):
    """
    DELETE /api/admin/alerts/<id> - Delete an admin alert.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, pk):
        deleted, _ = AdminAlert.objects.filter(id=pk).delete()
        if not deleted:
            return Response(
                {"success": False, "error": {"message": "Alert not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({"success": True, "message": "Alert deleted."})


class AdminAlertStatsView(APIView):
    """
    GET /api/admin/alerts/stats - Alert statistics.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models import Count
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        d24h = now - timedelta(hours=24)
        d7d = now - timedelta(days=7)

        total = AdminAlert.objects.count()
        unread = AdminAlert.objects.filter(is_read=False).count()
        last_24h = AdminAlert.objects.filter(created_at__gte=d24h).count()
        last_7d = AdminAlert.objects.filter(created_at__gte=d7d).count()

        by_category = list(
            AdminAlert.objects.filter(created_at__gte=d7d)
            .values("category").annotate(count=Count("id")).order_by("-count")
        )
        by_type = list(
            AdminAlert.objects.filter(created_at__gte=d7d)
            .values("alert_type").annotate(count=Count("id")).order_by("-count")[:10]
        )

        return Response({
            "success": True,
            "data": {
                "total": total,
                "unread": unread,
                "last_24h": last_24h,
                "last_7d": last_7d,
                "by_category": by_category,
                "by_type": by_type,
            }
        })


class AdminSendTargetedNotificationView(APIView):
    """
    POST /api/admin/notifications/send - Send targeted notification.
    Supports: all, branch, semester, selected users.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = AdminSendNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data = serializer.validated_data
        target_type = data["target_type"]
        title = data["title"]
        message = data["message"]
        ntype = data["notification_type"]
        priority = data["priority"]

        if target_type == "all":
            users = User.objects.filter(is_active=True, role="student")
        elif target_type == "branch":
            branch = data.get("target_branch", "")
            if not branch:
                return Response(
                    {"success": False, "error": {"message": "target_branch is required."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            users = User.objects.filter(is_active=True, role="student", branch__iexact=branch)
        elif target_type == "semester":
            semester = data.get("target_semester")
            if not semester:
                return Response(
                    {"success": False, "error": {"message": "target_semester is required."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            users = User.objects.filter(is_active=True, role="student", semester=semester)
        elif target_type == "selected":
            user_ids = data.get("target_user_ids", [])
            if not user_ids:
                return Response(
                    {"success": False, "error": {"message": "target_user_ids is required."}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            users = User.objects.filter(id__in=user_ids, is_active=True)
        else:
            users = User.objects.none()

        count = create_bulk_notifications(
            users, ntype, title, message, priority,
            metadata={"sent_by": str(request.user.id), "target_type": target_type},
        )

        # Log the action
        try:
            from apps.audit.utils import log_action
            log_action(
                request, "notification_send",
                f"Sent '{title}' to {count} users (target: {target_type})",
                "Notification",
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "message": f"Notification sent to {count} users.",
            "data": {"sent_count": count},
        })
