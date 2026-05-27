"""
WebSocket consumer for real-time group chat.
Handles: messages, typing indicators, online presence, read receipts.
"""
import json
import logging
from datetime import timedelta

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

logger = logging.getLogger(__name__)


class GroupChatConsumer(AsyncWebsocketConsumer):
    """
    Real-time chat consumer for study groups.
    URL: ws/groups/<group_id>/chat/?token=<jwt>
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())
        self.group_id = self.scope["url_route"]["kwargs"]["group_id"]
        self.room_group_name = f"group_chat_{self.group_id}"

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Verify membership
        is_member = await self.check_membership()
        if not is_member:
            await self.close(code=4003)
            return

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Update online status
        await self.update_last_seen()

        # Notify others that user came online
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_online",
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
            },
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            # Notify others that user went offline
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "user_offline",
                    "user_id": str(self.user.id),
                    "user_name": self.user.full_name,
                },
            )
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "send_message":
                await self.handle_send_message(data)
            elif action == "typing":
                await self.handle_typing(data)
            elif action == "stop_typing":
                await self.handle_stop_typing()
            elif action == "mark_read":
                await self.handle_mark_read(data)
            elif action == "pin_message":
                await self.handle_pin_message(data)
            elif action == "delete_message":
                await self.handle_delete_message(data)
            elif action == "heartbeat":
                await self.update_last_seen()

        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({"type": "error", "message": "Invalid JSON"}))
        except Exception as e:
            logger.error("GroupChatConsumer error: %s", e, exc_info=True)
            await self.send(text_data=json.dumps({"type": "error", "message": "Server error"}))

    # ── Action Handlers ───────────────────────────────────────────────────────

    async def handle_send_message(self, data):
        content = data.get("content", "").strip()
        reply_to_id = data.get("reply_to")

        if not content:
            return

        # Save message to DB
        message_data = await self.save_message(content, reply_to_id)

        # Broadcast to group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message_data,
            },
        )

        # Update group last_activity
        await self.update_group_activity()

    async def handle_typing(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "typing_indicator",
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
                "is_typing": True,
            },
        )

    async def handle_stop_typing(self):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "typing_indicator",
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
                "is_typing": False,
            },
        )

    async def handle_mark_read(self, data):
        message_id = data.get("message_id")
        if message_id:
            await self.mark_message_read(message_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "read_receipt",
                    "user_id": str(self.user.id),
                    "user_name": self.user.full_name,
                    "message_id": message_id,
                },
            )

    async def handle_pin_message(self, data):
        message_id = data.get("message_id")
        if message_id:
            pinned = await self.toggle_pin_message(message_id)
            if pinned is not None:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "message_pinned",
                        "message_id": message_id,
                        "is_pinned": pinned,
                        "user_name": self.user.full_name,
                    },
                )

    async def handle_delete_message(self, data):
        message_id = data.get("message_id")
        if message_id:
            deleted = await self.delete_message(message_id)
            if deleted:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "message_deleted",
                        "message_id": message_id,
                        "user_name": self.user.full_name,
                    },
                )

    # ── Group Send Handlers (broadcast to all in room) ────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            "type": "new_message",
            "message": event["message"],
        }))

    async def typing_indicator(self, event):
        # Don't send typing indicator back to the sender
        if event["user_id"] != str(self.user.id):
            await self.send(text_data=json.dumps({
                "type": "typing",
                "user_id": event["user_id"],
                "user_name": event["user_name"],
                "is_typing": event["is_typing"],
            }))

    async def read_receipt(self, event):
        await self.send(text_data=json.dumps({
            "type": "read_receipt",
            "user_id": event["user_id"],
            "user_name": event["user_name"],
            "message_id": event["message_id"],
        }))

    async def user_online(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_online",
            "user_id": event["user_id"],
            "user_name": event["user_name"],
        }))

    async def user_offline(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_offline",
            "user_id": event["user_id"],
            "user_name": event["user_name"],
        }))

    async def message_pinned(self, event):
        await self.send(text_data=json.dumps({
            "type": "message_pinned",
            "message_id": event["message_id"],
            "is_pinned": event["is_pinned"],
            "user_name": event["user_name"],
        }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            "type": "message_deleted",
            "message_id": event["message_id"],
            "user_name": event["user_name"],
        }))

    # ── Database Operations ───────────────────────────────────────────────────

    @database_sync_to_async
    def check_membership(self):
        from .models import GroupMembership
        return GroupMembership.objects.filter(
            group_id=self.group_id, user=self.user, is_active=True
        ).exists()

    @database_sync_to_async
    def save_message(self, content, reply_to_id=None):
        from .models import ChatMessage
        msg = ChatMessage(
            group_id=self.group_id,
            sender=self.user,
            content=content,
            message_type="text",
        )
        if reply_to_id:
            try:
                msg.reply_to_id = reply_to_id
            except Exception:
                pass
        msg.save()
        return {
            "id": str(msg.id),
            "sender_id": str(self.user.id),
            "sender_name": self.user.full_name,
            "content": msg.content,
            "message_type": msg.message_type,
            "reply_to": str(msg.reply_to_id) if msg.reply_to_id else None,
            "is_pinned": msg.is_pinned,
            "created_at": msg.created_at.isoformat(),
        }

    @database_sync_to_async
    def mark_message_read(self, message_id):
        from .models import MessageReadReceipt
        MessageReadReceipt.objects.get_or_create(
            message_id=message_id, user=self.user
        )

    @database_sync_to_async
    def toggle_pin_message(self, message_id):
        from .models import ChatMessage, GroupMembership
        # Only admins/moderators can pin
        membership = GroupMembership.objects.filter(
            group_id=self.group_id, user=self.user, is_active=True
        ).first()
        if not membership or membership.role not in ("admin", "moderator"):
            return None
        try:
            msg = ChatMessage.objects.get(id=message_id, group_id=self.group_id)
            msg.is_pinned = not msg.is_pinned
            msg.save(update_fields=["is_pinned"])
            return msg.is_pinned
        except ChatMessage.DoesNotExist:
            return None

    @database_sync_to_async
    def delete_message(self, message_id):
        from .models import ChatMessage
        try:
            msg = ChatMessage.objects.get(id=message_id, group_id=self.group_id)
            # Only sender or admin can delete
            if msg.sender != self.user:
                from .models import GroupMembership
                membership = GroupMembership.objects.filter(
                    group_id=self.group_id, user=self.user, is_active=True, role__in=["admin", "moderator"]
                ).first()
                if not membership:
                    return False
            msg.is_deleted = True
            msg.content = "[Message deleted]"
            msg.save(update_fields=["is_deleted", "content"])
            return True
        except ChatMessage.DoesNotExist:
            return False

    @database_sync_to_async
    def update_last_seen(self):
        from .models import GroupMembership
        GroupMembership.objects.filter(
            group_id=self.group_id, user=self.user, is_active=True
        ).update(last_seen=timezone.now())

    @database_sync_to_async
    def update_group_activity(self):
        from .models import StudyGroup
        StudyGroup.objects.filter(id=self.group_id).update(last_activity_at=timezone.now())
