"""
WebSocket consumers for real-time Moderation Dashboard.
Provides live updates for: reports, violations, chat monitoring, approvals.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class ModerationDashboardConsumer(AsyncWebsocketConsumer):
    """
    Real-time updates for moderator dashboard.
    Moderators receive instant notifications for:
    - New reports
    - Auto-moderation actions
    - Channel requests
    - Roadmap submissions
    - Toxic message detection
    """

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        role = await self._get_role()
        if role not in ("moderator", "admin", "super_admin"):
            await self.close(code=4003)
            return

        self.group_name = f"moderator_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add("moderators_all", self.channel_name)
        await self.accept()

        # Send initial dashboard stats
        stats = await self._get_dashboard_stats()
        await self.send(text_data=json.dumps({
            "type": "dashboard_init",
            "data": stats,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard("moderators_all", self.channel_name)

    async def receive(self, text_data):
        """Handle moderator commands via WebSocket."""
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "refresh_stats":
                stats = await self._get_dashboard_stats()
                await self.send(text_data=json.dumps({
                    "type": "dashboard_stats",
                    "data": stats,
                }))
            elif action == "start_shadow_monitor":
                channel_id = data.get("channel_id")
                if channel_id:
                    await self._start_shadow_monitor(channel_id)
                    await self.channel_layer.group_add(
                        f"chat_{channel_id}_monitor", self.channel_name
                    )
                    await self.send(text_data=json.dumps({
                        "type": "shadow_monitor_started",
                        "channel_id": channel_id,
                    }))
            elif action == "stop_shadow_monitor":
                channel_id = data.get("channel_id")
                if channel_id:
                    await self._stop_shadow_monitor(channel_id)
                    await self.channel_layer.group_discard(
                        f"chat_{channel_id}_monitor", self.channel_name
                    )
                    await self.send(text_data=json.dumps({
                        "type": "shadow_monitor_stopped",
                        "channel_id": channel_id,
                    }))
        except json.JSONDecodeError:
            pass

    # ── Event handlers (broadcast from other parts of the system) ─────────────

    async def moderation_alert(self, event):
        """Auto-moderation alert or system event."""
        await self.send(text_data=json.dumps({
            "type": "moderation_alert",
            "data": event.get("data", {}),
        }))

    async def new_report(self, event):
        """New content report filed."""
        await self.send(text_data=json.dumps({
            "type": "new_report",
            "data": event.get("data", {}),
        }))

    async def approval_request(self, event):
        """New approval request (channel, roadmap, etc.)."""
        await self.send(text_data=json.dumps({
            "type": "approval_request",
            "data": event.get("data", {}),
        }))

    async def chat_monitor_message(self, event):
        """Shadow-monitored chat message."""
        await self.send(text_data=json.dumps({
            "type": "monitored_message",
            "data": event.get("data", {}),
        }))

    async def toxic_message_detected(self, event):
        """Real-time toxic message detection alert."""
        await self.send(text_data=json.dumps({
            "type": "toxic_detected",
            "data": event.get("data", {}),
        }))

    async def user_violation(self, event):
        """User violation recorded."""
        await self.send(text_data=json.dumps({
            "type": "user_violation",
            "data": event.get("data", {}),
        }))

    async def roadmap_submitted(self, event):
        """New roadmap submitted for review."""
        await self.send(text_data=json.dumps({
            "type": "roadmap_submitted",
            "data": event.get("data", {}),
        }))

    async def channel_requested(self, event):
        """New channel creation request."""
        await self.send(text_data=json.dumps({
            "type": "channel_requested",
            "data": event.get("data", {}),
        }))

    # ── Database helpers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def _get_role(self):
        return self.user.role

    @database_sync_to_async
    def _get_dashboard_stats(self):
        from .models import ContentReport, ApprovalRequest, UserBan, ModerationActionLog
        from apps.communication.models import ChannelRequest, UserPresence
        from django.utils import timezone
        from datetime import timedelta

        now = timezone.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        return {
            "pending_reports": ContentReport.objects.filter(status="pending").count(),
            "investigating_reports": ContentReport.objects.filter(status="investigating").count(),
            "pending_channel_requests": ChannelRequest.objects.filter(status="pending").count(),
            "pending_roadmaps": ApprovalRequest.objects.filter(
                status="pending", request_type="roadmap"
            ).count(),
            "pending_notes": ApprovalRequest.objects.filter(
                status="pending", request_type="note"
            ).count(),
            "pending_study_groups": ApprovalRequest.objects.filter(
                status="pending", request_type="study_group"
            ).count(),
            "active_bans": UserBan.objects.filter(is_active=True).count(),
            "actions_today": ModerationActionLog.objects.filter(
                created_at__gte=today
            ).count(),
            "active_users": UserPresence.objects.filter(status="online").count(),
            "violations_7d": ModerationActionLog.objects.filter(
                created_at__gte=now - timedelta(days=7)
            ).count(),
        }

    @database_sync_to_async
    def _start_shadow_monitor(self, channel_id):
        from .models import ShadowMonitorSession
        # End any existing session for this channel
        ShadowMonitorSession.objects.filter(
            moderator=self.user, channel_id=channel_id, is_active=True
        ).update(is_active=False, ended_at=timezone.now())
        # Start new session
        ShadowMonitorSession.objects.create(
            moderator=self.user, channel_id=channel_id
        )

    @database_sync_to_async
    def _stop_shadow_monitor(self, channel_id):
        from .models import ShadowMonitorSession
        ShadowMonitorSession.objects.filter(
            moderator=self.user, channel_id=channel_id, is_active=True
        ).update(is_active=False, ended_at=timezone.now())
