"""
WebSocket consumer for real-time academic performance updates.
Students get instant sync when marks are updated or CGPA changes.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class AcademicConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time academic data sync.
    Each user joins their own group: academic_{user_id}
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f"academic_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial academic summary
        summary = await self.get_academic_summary()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "summary": summary,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "get_summary":
                summary = await self.get_academic_summary()
                await self.send(text_data=json.dumps({
                    "type": "summary_update",
                    "summary": summary,
                }))
            elif action == "get_analytics":
                analytics = await self.get_analytics_data()
                await self.send(text_data=json.dumps({
                    "type": "analytics_update",
                    "analytics": analytics,
                }))
        except json.JSONDecodeError:
            pass

    async def academic_updated(self, event):
        """Handle academic update pushed to this user's group."""
        await self.send(text_data=json.dumps({
            "type": "academic_updated",
            "update_type": event.get("update_type"),
            "data": event.get("data", {}),
        }))

    @database_sync_to_async
    def get_academic_summary(self):
        from .models import AcademicProfile
        profile = AcademicProfile.objects.filter(user=self.user).first()
        if not profile:
            return {
                "current_cgpa": 0,
                "total_credits": 0,
                "total_semesters": 0,
                "academic_standing": "good",
                "total_backlogs": 0,
            }
        return {
            "current_cgpa": float(profile.current_cgpa),
            "total_credits": profile.total_credits_earned,
            "total_semesters": profile.total_semesters,
            "highest_sgpa": float(profile.highest_sgpa),
            "lowest_sgpa": float(profile.lowest_sgpa),
            "academic_standing": profile.academic_standing,
            "total_backlogs": profile.total_backlogs,
            "improvement_percentage": profile.improvement_percentage,
        }

    @database_sync_to_async
    def get_analytics_data(self):
        from decimal import Decimal
        from .models import AcademicProfile
        profile = AcademicProfile.objects.filter(user=self.user).first()
        if not profile:
            return {}

        semesters = list(profile.semesters.order_by("semester"))
        cgpa_progress = []
        total_credits = 0
        weighted = Decimal(0)
        for sem in semesters:
            total_credits += sem.total_credits
            weighted += Decimal(sem.sgpa) * sem.total_credits
            rolling = float(round(weighted / total_credits, 2)) if total_credits else 0
            cgpa_progress.append({
                "semester": sem.semester,
                "sgpa": float(sem.sgpa),
                "cgpa": rolling,
            })

        return {"cgpa_progress": cgpa_progress}
