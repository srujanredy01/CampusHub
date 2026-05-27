"""
WebSocket consumer for live event features (chat, Q&A, polls).
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class EventLiveConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for live event interactions."""

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.event_id = str(self.scope["url_route"]["kwargs"]["event_id"])
        self.room_group = f"event_live_{self.event_id}"

        await self.channel_layer.group_add(self.room_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "room_group"):
            await self.channel_layer.group_discard(self.room_group, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "chat_message":
                content = data.get("content", "").strip()
                if not content:
                    return
                msg = await self.save_chat_message(content)
                if msg:
                    await self.channel_layer.group_send(self.room_group, {
                        "type": "event.chat",
                        "message": {
                            "id": str(msg["id"]),
                            "user_id": str(self.user.id),
                            "user_name": self.user.full_name,
                            "user_role": self.user.role,
                            "content": content,
                            "created_at": msg["created_at"],
                        },
                    })
            elif action == "question":
                question_text = data.get("question", "").strip()
                if question_text:
                    q = await self.save_question(question_text)
                    if q:
                        await self.channel_layer.group_send(self.room_group, {
                            "type": "event.question",
                            "question": q,
                        })
            elif action == "upvote_question":
                qid = data.get("question_id")
                if qid:
                    result = await self.toggle_upvote(qid)
                    await self.channel_layer.group_send(self.room_group, {
                        "type": "event.upvote",
                        "question_id": qid,
                        "upvotes": result["upvotes"],
                    })
        except json.JSONDecodeError:
            pass

    # ── Group message handlers ────────────────────────────────────────────────

    async def event_chat(self, event):
        await self.send(text_data=json.dumps({"type": "chat_message", **event["message"]}))

    async def event_question(self, event):
        await self.send(text_data=json.dumps({"type": "new_question", **event["question"]}))

    async def event_upvote(self, event):
        await self.send(text_data=json.dumps({
            "type": "question_upvote",
            "question_id": event["question_id"],
            "upvotes": event["upvotes"],
        }))

    async def event_announcement(self, event):
        await self.send(text_data=json.dumps({"type": "announcement", **event["announcement"]}))

    async def event_poll_update(self, event):
        await self.send(text_data=json.dumps({"type": "poll_update", **event["poll"]}))

    # ── Database helpers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def save_chat_message(self, content):
        from .models import EventChatMessage
        try:
            msg = EventChatMessage.objects.create(
                event_id=self.event_id, user=self.user, content=content
            )
            return {"id": msg.id, "created_at": msg.created_at.isoformat()}
        except Exception as e:
            logger.warning("save_chat_message failed: %s", e)
            return None

    @database_sync_to_async
    def save_question(self, question_text):
        from .models import EventQuestion
        try:
            q = EventQuestion.objects.create(
                event_id=self.event_id, user=self.user, question=question_text
            )
            return {
                "id": str(q.id),
                "user_id": str(self.user.id),
                "user_name": self.user.full_name,
                "question": question_text,
                "upvotes": 0,
                "is_answered": False,
                "created_at": q.created_at.isoformat(),
            }
        except Exception as e:
            logger.warning("save_question failed: %s", e)
            return None

    @database_sync_to_async
    def toggle_upvote(self, question_id):
        from .models import EventQuestion, EventQuestionUpvote
        try:
            q = EventQuestion.objects.get(id=question_id)
            upvote, created = EventQuestionUpvote.objects.get_or_create(
                question=q, user=self.user
            )
            if not created:
                upvote.delete()
                q.upvotes = max(0, q.upvotes - 1)
            else:
                q.upvotes += 1
            q.save(update_fields=["upvotes"])
            return {"upvotes": q.upvotes}
        except Exception:
            return {"upvotes": 0}
