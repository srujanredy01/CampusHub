"""
WebSocket consumers for real-time chat.
- ChatConsumer: Channel-based group chat
- DMConsumer: Direct message conversations
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for channel chat."""

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.channel_slug = self.scope["url_route"]["kwargs"]["slug"]
        self.room_group = f"chat_{self.channel_slug}"

        # Verify membership
        is_member = await self.check_membership()
        if not is_member:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()
        await self.update_presence("online")

        # Notify others
        await self.channel_layer.group_send(self.room_group, {
            "type": "user.join",
            "user_id": str(self.user.id),
            "user_name": self.user.full_name,
        })

    async def disconnect(self, close_code):
        if hasattr(self, "room_group"):
            await self.channel_layer.group_send(self.room_group, {
                "type": "user.leave",
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
            })
            await self.channel_layer.group_discard(self.room_group, self.channel_name)
        await self.update_presence("offline")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "message":
                await self.handle_message(data)
            elif action == "typing":
                await self.handle_typing(data)
            elif action == "read":
                await self.handle_read(data)
            elif action == "reaction":
                await self.handle_reaction(data)
        except json.JSONDecodeError:
            pass

    async def handle_message(self, data):
        content = data.get("content", "").strip()
        if not content:
            return
        msg = await self.save_message(content, data)
        if msg:
            await self.channel_layer.group_send(self.room_group, {
                "type": "chat.message",
                "message": {
                    "id": str(msg["id"]),
                    "sender": str(self.user.id),
                    "sender_name": self.user.full_name,
                    "sender_role": self.user.role,
                    "content": content,
                    "message_type": data.get("message_type", "text"),
                    "code_language": data.get("code_language", ""),
                    "reply_to": data.get("reply_to"),
                    "thread_parent": data.get("thread_parent"),
                    "mentions": data.get("mentions", []),
                    "created_at": msg["created_at"],
                },
            })

    async def handle_typing(self, data):
        await self.channel_layer.group_send(self.room_group, {
            "type": "user.typing",
            "user_id": str(self.user.id),
            "user_name": self.user.full_name,
            "is_typing": data.get("is_typing", True),
        })

    async def handle_read(self, data):
        message_id = data.get("message_id")
        if message_id:
            await self.mark_read(message_id)

    async def handle_reaction(self, data):
        message_id = data.get("message_id")
        emoji = data.get("emoji")
        if message_id and emoji:
            result = await self.toggle_reaction(message_id, emoji)
            await self.channel_layer.group_send(self.room_group, {
                "type": "message.reaction",
                "message_id": message_id,
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
                "emoji": emoji,
                "action": result,
            })

    # ── Group message handlers ────────────────────────────────────────────────

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({"type": "message", **event["message"]}))

    async def user_typing(self, event):
        if event["user_id"] != str(self.user.id):
            await self.send(text_data=json.dumps({
                "type": "typing",
                "user_id": event["user_id"],
                "user_name": event["user_name"],
                "is_typing": event["is_typing"],
            }))

    async def user_join(self, event):
        await self.send(text_data=json.dumps({"type": "user_join", **event}))

    async def user_leave(self, event):
        await self.send(text_data=json.dumps({"type": "user_leave", **event}))

    async def message_reaction(self, event):
        await self.send(text_data=json.dumps({"type": "reaction", **event}))

    # ── Database helpers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def check_membership(self):
        from .models import Channel, ChannelMembership
        try:
            channel = Channel.objects.get(slug=self.channel_slug, is_active=True)
            if self.user.role in ("admin", "super_admin"):
                return True
            if channel.visibility == "public":
                # Auto-join public channels
                ChannelMembership.objects.get_or_create(
                    channel=channel, user=self.user, defaults={"role": "member"}
                )
                return True
            return ChannelMembership.objects.filter(
                channel=channel, user=self.user, is_banned=False
            ).exists()
        except Channel.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content, data):
        from .models import Channel, Message
        try:
            channel = Channel.objects.get(slug=self.channel_slug)
            msg = Message.objects.create(
                channel=channel,
                sender=self.user,
                content=content,
                message_type=data.get("message_type", "text"),
                code_language=data.get("code_language", ""),
                reply_to_id=data.get("reply_to"),
                thread_parent_id=data.get("thread_parent"),
                mentions=data.get("mentions", []),
            )
            channel.message_count = (channel.message_count or 0) + 1
            channel.last_message_at = msg.created_at
            channel.save(update_fields=["message_count", "last_message_at"])
            return {"id": msg.id, "created_at": msg.created_at.isoformat()}
        except Exception as e:
            logger.warning("save_message failed: %s", e)
            return None

    @database_sync_to_async
    def mark_read(self, message_id):
        from .models import MessageReadReceipt, Message
        try:
            msg = Message.objects.get(id=message_id)
            MessageReadReceipt.objects.get_or_create(message=msg, user=self.user)
            msg.read_count = msg.read_receipts.count()
            msg.save(update_fields=["read_count"])
        except Exception:
            pass

    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji):
        from .models import Message, MessageReaction
        try:
            msg = Message.objects.get(id=message_id)
            reaction, created = MessageReaction.objects.get_or_create(
                message=msg, user=self.user, emoji=emoji
            )
            if not created:
                reaction.delete()
                msg.reaction_count = msg.reactions.count()
                msg.save(update_fields=["reaction_count"])
                return "removed"
            msg.reaction_count = msg.reactions.count()
            msg.save(update_fields=["reaction_count"])
            return "added"
        except Exception:
            return "error"

    @database_sync_to_async
    def update_presence(self, status_val):
        from .models import UserPresence
        UserPresence.objects.update_or_create(
            user=self.user, defaults={"status": status_val}
        )


class DMConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for direct messages."""

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.conversation_id = str(self.scope["url_route"]["kwargs"]["conversation_id"])
        self.room_group = f"dm_{self.conversation_id}"

        is_participant = await self.check_participant()
        if not is_participant:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group"):
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")
            if action == "message":
                content = data.get("content", "").strip()
                if not content:
                    return
                msg = await self.save_dm(content, data)
                if msg:
                    await self.channel_layer.group_send(self.room_group, {
                        "type": "dm.message",
                        "message": {
                            "id": str(msg["id"]),
                            "sender": str(self.user.id),
                            "sender_name": self.user.full_name,
                            "content": content,
                            "message_type": data.get("message_type", "text"),
                            "created_at": msg["created_at"],
                        },
                    })
            elif action == "typing":
                await self.channel_layer.group_send(self.room_group, {
                    "type": "dm.typing",
                    "user_id": str(self.user.id),
                    "user_name": self.user.full_name,
                    "is_typing": data.get("is_typing", True),
                })
        except json.JSONDecodeError:
            pass

    async def dm_message(self, event):
        await self.send(text_data=json.dumps({"type": "message", **event["message"]}))

    async def dm_typing(self, event):
        if event["user_id"] != str(self.user.id):
            await self.send(text_data=json.dumps({
                "type": "typing",
                "user_id": event["user_id"],
                "user_name": event["user_name"],
                "is_typing": event["is_typing"],
            }))

    @database_sync_to_async
    def check_participant(self):
        from .models import ConversationParticipant
        return ConversationParticipant.objects.filter(
            conversation_id=self.conversation_id, user=self.user
        ).exists()

    @database_sync_to_async
    def save_dm(self, content, data):
        from .models import DirectConversation, Message
        try:
            conv = DirectConversation.objects.get(id=self.conversation_id)
            msg = Message.objects.create(
                conversation=conv,
                sender=self.user,
                content=content,
                message_type=data.get("message_type", "text"),
            )
            conv.message_count = (conv.message_count or 0) + 1
            conv.last_message_at = msg.created_at
            conv.last_message_preview = content[:200]
            conv.save(update_fields=["message_count", "last_message_at", "last_message_preview"])
            return {"id": msg.id, "created_at": msg.created_at.isoformat()}
        except Exception as e:
            logger.warning("save_dm failed: %s", e)
            return None
