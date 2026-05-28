"""
WebSocket consumer for real-time feedback notifications.
Admins/moderators join the 'feedback_admins' group to receive live updates.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class FeedbackConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for feedback real-time updates.
    - Admins/moderators receive new feedback notifications.
    - Users receive status updates on their reports.
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Admins and moderators join the feedback admin group
        if self.user.role in ("admin", "super_admin", "moderator"):
            self.group_name = "feedback_admins"
            await self.channel_layer.group_add(self.group_name, self.channel_name)

        # All users join their personal feedback group for status updates
        self.user_group = f"feedback_user_{self.user.id}"
        await self.channel_layer.group_add(self.user_group, self.channel_name)

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if hasattr(self, "user_group"):
            await self.channel_layer.group_discard(self.user_group, self.channel_name)

    async def feedback_new(self, event):
        """New feedback report submitted — sent to admins."""
        await self.send(text_data=json.dumps({
            "type": "new_feedback",
            "feedback": event["feedback"],
        }))

    async def feedback_status_update(self, event):
        """Feedback status changed — sent to the report author."""
        await self.send(text_data=json.dumps({
            "type": "status_update",
            "data": event["data"],
        }))
