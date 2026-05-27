"""
WebSocket consumer for real-time Saved Content synchronization.
Each user joins their own group: user_saved_{user_id}
Events: saved_item_added, saved_item_removed, saved_counts_updated
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class SavedContentConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time saved content updates.
    Each authenticated user joins their own group for instant sync.
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f"user_saved_{self.user.id}"

        # Join user-specific saved content group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial counts
        counts = await self.get_saved_counts()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "counts": counts,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle messages from the client (e.g., request counts refresh)."""
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "get_counts":
                counts = await self.get_saved_counts()
                await self.send(text_data=json.dumps({
                    "type": "counts_updated",
                    "counts": counts,
                }))

        except json.JSONDecodeError:
            pass

    # ── Group message handlers ────────────────────────────────────────────────

    async def saved_item_added(self, event):
        """Handle new saved item pushed to this user's group."""
        await self.send(text_data=json.dumps({
            "type": "saved_item_added",
            "item": event["item"],
            "counts": event.get("counts", {}),
        }))

    async def saved_item_removed(self, event):
        """Handle saved item removal pushed to this user's group."""
        await self.send(text_data=json.dumps({
            "type": "saved_item_removed",
            "item_id": event["item_id"],
            "content_type": event["content_type"],
            "object_id": event["object_id"],
            "counts": event.get("counts", {}),
        }))

    async def saved_counts_updated(self, event):
        """Handle counts update."""
        await self.send(text_data=json.dumps({
            "type": "counts_updated",
            "counts": event["counts"],
        }))

    # ── Database helpers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def get_saved_counts(self):
        from apps.saved.views import _get_aggregated_counts
        return _get_aggregated_counts(self.user)
