"""
WebSocket consumer for real-time attendance updates.
Students get instant sync when attendance is marked.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class AttendanceConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time attendance sync.
    Each user joins their own group: user_attendance_{user_id}
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f"user_attendance_{self.user.id}"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial summary
        summary = await self.get_attendance_summary()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "summary": summary,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "get_summary":
                summary = await self.get_attendance_summary()
                await self.send(text_data=json.dumps({
                    "type": "summary_update",
                    "summary": summary,
                }))
        except json.JSONDecodeError:
            pass

    # Group message handlers
    async def attendance_updated(self, event):
        """Handle attendance update pushed to this user's group."""
        await self.send(text_data=json.dumps({
            "type": "attendance_updated",
            "subject": event["subject"],
            "summary": event.get("summary", {}),
        }))

    @database_sync_to_async
    def get_attendance_summary(self):
        from .models import SubjectAttendance
        subjects = SubjectAttendance.objects.filter(student=self.user)
        total_attended = sum(s.attended_classes for s in subjects)
        total_classes = sum(s.total_classes for s in subjects)
        overall_pct = round((total_attended / total_classes) * 100, 2) if total_classes > 0 else 0
        shortage_count = sum(1 for s in subjects if s.is_shortage)

        return {
            "total_subjects": subjects.count(),
            "overall_percentage": overall_pct,
            "total_attended": total_attended,
            "total_classes": total_classes,
            "shortage_count": shortage_count,
        }
