"""
WebSocket consumers for real-time notifications.
- NotificationConsumer: For regular users (students)
- AdminNotificationConsumer: For admin users (activity alerts)
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for user notifications.
    Each user joins their own group: user_notifications_{user_id}
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f"user_notifications_{self.user.id}"

        # Join user-specific notification group
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # Also join role-based groups for targeted notifications
        await self.channel_layer.group_add(f"role_{self.user.role}", self.channel_name)

        if self.user.branch:
            await self.channel_layer.group_add(
                f"branch_{self.user.branch.lower().replace(' ', '_')}",
                self.channel_name,
            )

        if self.user.semester:
            await self.channel_layer.group_add(
                f"semester_{self.user.semester}",
                self.channel_name,
            )

        await self.accept()

        # Send initial unread count
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "unread_count": unread_count,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

        if hasattr(self, "user") and self.user.is_authenticated:
            await self.channel_layer.group_discard(
                f"role_{self.user.role}", self.channel_name
            )
            if self.user.branch:
                await self.channel_layer.group_discard(
                    f"branch_{self.user.branch.lower().replace(' ', '_')}",
                    self.channel_name,
                )
            if self.user.semester:
                await self.channel_layer.group_discard(
                    f"semester_{self.user.semester}",
                    self.channel_name,
                )

    async def receive(self, text_data):
        """Handle messages from the client (e.g., mark read)."""
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "mark_read":
                notification_id = data.get("notification_id")
                if notification_id:
                    await self.mark_notification_read(notification_id)
                    unread_count = await self.get_unread_count()
                    await self.send(text_data=json.dumps({
                        "type": "unread_update",
                        "unread_count": unread_count,
                    }))

            elif action == "mark_all_read":
                await self.mark_all_read()
                await self.send(text_data=json.dumps({
                    "type": "unread_update",
                    "unread_count": 0,
                }))

        except json.JSONDecodeError:
            pass

    # ── Group message handlers ────────────────────────────────────────────────

    async def notification_new(self, event):
        """Handle new notification pushed to this user's group."""
        await self.send(text_data=json.dumps({
            "type": "new_notification",
            "notification": event["notification"],
            "unread_count": event.get("unread_count", 0),
        }))

    async def notification_broadcast(self, event):
        """Handle broadcast notification (to role/branch/semester groups)."""
        await self.send(text_data=json.dumps({
            "type": "new_notification",
            "notification": event["notification"],
            "unread_count": await self.get_unread_count(),
        }))

    # ── Database helpers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def get_unread_count(self):
        from apps.notifications.models import Notification
        return Notification.objects.filter(user=self.user, is_read=False).count()

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        from apps.notifications.models import Notification
        Notification.objects.filter(
            user=self.user, id=notification_id
        ).update(is_read=True)

    @database_sync_to_async
    def mark_all_read(self):
        from apps.notifications.models import Notification
        Notification.objects.filter(
            user=self.user, is_read=False
        ).update(is_read=True)


class AdminNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for admin real-time alerts.
    Only admin users can connect. Joins the 'admin_alerts' group.
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        if self.user.role != "admin":
            await self.close(code=4003)
            return

        self.group_name = "admin_alerts"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial unread alert count
        unread_count = await self.get_unread_alert_count()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "unread_count": unread_count,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle messages from admin client."""
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "mark_read":
                alert_id = data.get("alert_id")
                if alert_id:
                    await self.mark_alert_read(alert_id)
                    unread_count = await self.get_unread_alert_count()
                    await self.send(text_data=json.dumps({
                        "type": "unread_update",
                        "unread_count": unread_count,
                    }))

            elif action == "mark_all_read":
                await self.mark_all_alerts_read()
                await self.send(text_data=json.dumps({
                    "type": "unread_update",
                    "unread_count": 0,
                }))

        except json.JSONDecodeError:
            pass

    # ── Group message handlers ────────────────────────────────────────────────

    async def admin_alert(self, event):
        """Handle new admin alert."""
        await self.send(text_data=json.dumps({
            "type": "new_alert",
            "alert": event["alert"],
            "unread_count": event.get("unread_count", 0),
        }))

    async def admin_activity(self, event):
        """Handle live activity feed update."""
        await self.send(text_data=json.dumps({
            "type": "activity_update",
            "activity": event["activity"],
        }))

    # ── Database helpers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def get_unread_alert_count(self):
        from apps.notifications.models import AdminAlert
        return AdminAlert.objects.filter(is_read=False).count()

    @database_sync_to_async
    def mark_alert_read(self, alert_id):
        from apps.notifications.models import AdminAlert
        AdminAlert.objects.filter(id=alert_id).update(is_read=True)

    @database_sync_to_async
    def mark_all_alerts_read(self):
        from apps.notifications.models import AdminAlert
        AdminAlert.objects.filter(is_read=False).update(is_read=True)
