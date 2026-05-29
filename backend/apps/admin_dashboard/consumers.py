"""
WebSocket consumer for real-time Admin Dashboard updates.
Pushes live stats, notifications, and activity to connected admin users.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class AdminDashboardConsumer(AsyncWebsocketConsumer):
    """
    Real-time admin dashboard WebSocket.
    Admins join the 'admin_dashboard' group and receive live updates for:
    - User counts, active users
    - Attendance updates
    - Assignment submissions
    - Event registrations
    - Reports/flags
    - Study group activity
    - Channel activity
    - Notifications
    """

    async def connect(self):
        self.user = self.scope.get("user", AnonymousUser())

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Only admin and super_admin can connect
        if self.user.role not in ("admin", "super_admin"):
            await self.close(code=4003)
            return

        self.group_name = "admin_dashboard"

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial dashboard stats
        stats = await self.get_dashboard_stats()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "data": stats,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "get_stats":
                stats = await self.get_dashboard_stats()
                await self.send(text_data=json.dumps({
                    "type": "stats_update",
                    "data": stats,
                }))
            elif action == "get_active_users":
                active = await self.get_active_users_count()
                await self.send(text_data=json.dumps({
                    "type": "active_users_update",
                    "data": {"active_users_now": active},
                }))
        except json.JSONDecodeError:
            pass

    # ── Group message handlers ─────────────────────────────────────────────

    async def dashboard_update(self, event):
        """Generic dashboard update pushed to admin group."""
        await self.send(text_data=json.dumps({
            "type": "dashboard_update",
            "category": event.get("category", "general"),
            "data": event.get("data", {}),
        }))

    async def user_activity(self, event):
        """New user activity (login, registration, etc.)."""
        await self.send(text_data=json.dumps({
            "type": "user_activity",
            "data": event.get("data", {}),
        }))

    async def attendance_update(self, event):
        """Attendance marked/updated."""
        await self.send(text_data=json.dumps({
            "type": "attendance_update",
            "data": event.get("data", {}),
        }))

    async def assignment_update(self, event):
        """Assignment submitted/graded."""
        await self.send(text_data=json.dumps({
            "type": "assignment_update",
            "data": event.get("data", {}),
        }))

    async def event_update(self, event):
        """Event registration/activity."""
        await self.send(text_data=json.dumps({
            "type": "event_update",
            "data": event.get("data", {}),
        }))

    async def report_update(self, event):
        """New report/flag submitted."""
        await self.send(text_data=json.dumps({
            "type": "report_update",
            "data": event.get("data", {}),
        }))

    async def notification_update(self, event):
        """Admin notification."""
        await self.send(text_data=json.dumps({
            "type": "notification_update",
            "data": event.get("data", {}),
        }))

    async def study_group_update(self, event):
        """Study group activity."""
        await self.send(text_data=json.dumps({
            "type": "study_group_update",
            "data": event.get("data", {}),
        }))

    async def channel_update(self, event):
        """Communication channel activity."""
        await self.send(text_data=json.dumps({
            "type": "channel_update",
            "data": event.get("data", {}),
        }))

    async def analytics_update(self, event):
        """Analytics data refresh."""
        await self.send(text_data=json.dumps({
            "type": "analytics_update",
            "data": event.get("data", {}),
        }))

    # ── Data fetchers ──────────────────────────────────────────────────────

    @database_sync_to_async
    def get_dashboard_stats(self):
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from datetime import timedelta

        User = get_user_model()
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        d7 = now - timedelta(days=7)

        total_students = User.objects.filter(role="student").count()
        total_faculty = User.objects.filter(role="faculty").count()
        total_moderators = User.objects.filter(role="moderator").count()

        # Active users (logged in within last 15 minutes)
        active_threshold = now - timedelta(minutes=15)
        active_users_now = User.objects.filter(
            last_login__gte=active_threshold, is_active=True
        ).count()

        # Departments & Sections
        from .models import Department, Section
        departments_count = Department.objects.filter(is_active=True).count()
        sections_count = Section.objects.filter(is_active=True).count()

        # Study Groups
        from apps.study_groups.models import StudyGroup
        active_groups = StudyGroup.objects.filter(is_active=True).count()

        # Channels
        from apps.communication.models import Channel
        active_channels = Channel.objects.filter(is_active=True).count()

        # Assignments submitted today
        from apps.assignments.models import AssignmentSubmission
        assignments_today = AssignmentSubmission.objects.filter(
            submitted_at__gte=today_start
        ).count()

        # Attendance today
        from apps.attendance.models import SubjectAttendance
        attendance_today = SubjectAttendance.objects.filter(
            updated_at__gte=today_start
        ).count()

        # Upcoming events
        from apps.events.models import Event
        upcoming_events = Event.objects.filter(
            starts_at__gte=now, is_active=True
        ).exclude(status="draft").count()

        # Pending reports
        try:
            from apps.communication.models import MessageReport
            pending_reports = MessageReport.objects.filter(status="pending").count()
        except Exception:
            pending_reports = 0

        # Pending roadmap reviews
        try:
            from apps.roadmaps.models import Roadmap
            pending_roadmaps = Roadmap.objects.filter(status="pending").count()
        except Exception:
            pending_roadmaps = 0

        # Resource uploads today
        from apps.resources.models import Resource
        resources_today = Resource.objects.filter(
            created_at__gte=today_start
        ).count()

        return {
            "total_students": total_students,
            "total_faculty": total_faculty,
            "total_moderators": total_moderators,
            "departments": departments_count,
            "sections": sections_count,
            "active_study_groups": active_groups,
            "active_channels": active_channels,
            "assignments_today": assignments_today,
            "attendance_today": attendance_today,
            "upcoming_events": upcoming_events,
            "pending_reports": pending_reports,
            "pending_roadmap_reviews": pending_roadmaps,
            "resources_today": resources_today,
            "active_users_now": active_users_now,
        }

    @database_sync_to_async
    def get_active_users_count(self):
        from django.contrib.auth import get_user_model
        from django.utils import timezone
        from datetime import timedelta

        User = get_user_model()
        threshold = timezone.now() - timedelta(minutes=15)
        return User.objects.filter(
            last_login__gte=threshold, is_active=True
        ).count()
