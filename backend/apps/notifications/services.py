"""
Notification service — creates notifications and pushes them via WebSocket.
All functions are safe (never raise) for use in middleware/signals.
"""
import logging
from concurrent.futures import ThreadPoolExecutor

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model

from .models import Notification, AdminAlert

logger = logging.getLogger(__name__)
User = get_user_model()

# Background thread pool for non-blocking notification dispatch
_NOTIFY_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="notify")


def _get_channel_layer():
    """Get channel layer, returns None if not configured."""
    try:
        return get_channel_layer()
    except Exception:
        return None


# ─── User Notification Helpers ────────────────────────────────────────────────

def create_user_notification(user, notification_type, title, message, priority="normal", metadata=None):
    """
    Create a notification for a specific user and push via WebSocket.
    Safe — never raises.
    """
    try:
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            metadata=metadata or {},
        )
        # Push via WebSocket
        _push_user_notification(user, notification)
        return notification
    except Exception as e:
        logger.warning("create_user_notification failed: %s", e)
        return None


def create_bulk_notifications(users_queryset, notification_type, title, message, priority="normal", metadata=None):
    """
    Create notifications for multiple users and push via WebSocket.
    Uses bulk_create for efficiency.
    """
    try:
        notifications = [
            Notification(
                user=user,
                notification_type=notification_type,
                title=title,
                message=message,
                priority=priority,
                metadata=metadata or {},
            )
            for user in users_queryset
        ]
        created = Notification.objects.bulk_create(notifications, batch_size=500)

        # Push via WebSocket to each user
        for notification in created:
            _push_user_notification(notification.user, notification)

        return len(created)
    except Exception as e:
        logger.warning("create_bulk_notifications failed: %s", e)
        return 0


def notify_all_students(notification_type, title, message, priority="normal", metadata=None):
    """Send notification to all active students."""
    users = User.objects.filter(is_active=True, role="student")
    return create_bulk_notifications(users, notification_type, title, message, priority, metadata)


def notify_branch(branch, notification_type, title, message, priority="normal", metadata=None):
    """Send notification to all students in a branch."""
    users = User.objects.filter(is_active=True, role="student", branch__iexact=branch)
    return create_bulk_notifications(users, notification_type, title, message, priority, metadata)


def notify_semester(semester, notification_type, title, message, priority="normal", metadata=None):
    """Send notification to all students in a semester."""
    users = User.objects.filter(is_active=True, role="student", semester=semester)
    return create_bulk_notifications(users, notification_type, title, message, priority, metadata)


def _push_user_notification(user, notification):
    """Push notification to user via WebSocket channel layer."""
    try:
        channel_layer = _get_channel_layer()
        if not channel_layer:
            return

        group_name = f"user_notifications_{user.id}"
        unread_count = Notification.objects.filter(user=user, is_read=False).count()

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification.new",
                "notification": {
                    "id": str(notification.id),
                    "notification_type": notification.notification_type,
                    "title": notification.title,
                    "message": notification.message,
                    "priority": notification.priority,
                    "is_read": False,
                    "metadata": notification.metadata,
                    "created_at": notification.created_at.isoformat(),
                },
                "unread_count": unread_count,
            },
        )
    except Exception as e:
        logger.debug("WebSocket push to user failed: %s", e)


# ─── Admin Alert Helpers ──────────────────────────────────────────────────────

def create_admin_alert(alert_type, category, title, message, user=None, metadata=None):
    """
    Create an admin alert and push via WebSocket to all connected admins.
    Safe — never raises.
    """
    try:
        alert = AdminAlert.objects.create(
            alert_type=alert_type,
            category=category,
            title=title,
            message=message,
            user=user,
            metadata=metadata or {},
        )
        # Push via WebSocket
        _push_admin_alert(alert)
        return alert
    except Exception as e:
        logger.warning("create_admin_alert failed: %s", e)
        return None


def create_admin_alert_async(alert_type, category, title, message, user=None, metadata=None):
    """Fire-and-forget admin alert creation in background thread."""
    _NOTIFY_EXECUTOR.submit(
        create_admin_alert, alert_type, category, title, message, user, metadata
    )


def _push_admin_alert(alert):
    """Push alert to admin WebSocket group."""
    try:
        channel_layer = _get_channel_layer()
        if not channel_layer:
            return

        unread_count = AdminAlert.objects.filter(is_read=False).count()

        async_to_sync(channel_layer.group_send)(
            "admin_alerts",
            {
                "type": "admin.alert",
                "alert": {
                    "id": str(alert.id),
                    "alert_type": alert.alert_type,
                    "category": alert.category,
                    "title": alert.title,
                    "message": alert.message,
                    "user_name": alert.user.full_name if alert.user else "",
                    "user_id": str(alert.user.id) if alert.user else "",
                    "is_read": False,
                    "metadata": alert.metadata,
                    "created_at": alert.created_at.isoformat(),
                },
                "unread_count": unread_count,
            },
        )
    except Exception as e:
        logger.debug("WebSocket push to admin failed: %s", e)


def push_activity_to_admin(activity_data):
    """Push live activity feed update to admin dashboard."""
    try:
        channel_layer = _get_channel_layer()
        if not channel_layer:
            return

        async_to_sync(channel_layer.group_send)(
            "admin_alerts",
            {
                "type": "admin.activity",
                "activity": activity_data,
            },
        )
    except Exception as e:
        logger.debug("WebSocket activity push failed: %s", e)
