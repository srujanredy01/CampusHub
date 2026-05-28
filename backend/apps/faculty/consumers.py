"""
WebSocket consumers for Faculty System real-time updates.
Includes: Dashboard updates, Faculty Chat, Attendance alerts.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger(__name__)


class FacultyDashboardConsumer(AsyncWebsocketConsumer):
    """Real-time updates for faculty dashboard."""

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        role = await self._get_role()
        if role not in ("faculty", "admin", "super_admin"):
            await self.close(code=4003)
            return

        self.group_name = f"faculty_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        # Global faculty group for broadcasts
        await self.channel_layer.group_add("faculty_all", self.channel_name)
        await self.accept()

        # Send initial dashboard data
        stats = await self._get_dashboard_stats()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "data": stats,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            await self.channel_layer.group_discard("faculty_all", self.channel_name)

    async def receive(self, text_data):
        """Handle incoming messages from faculty client."""
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "refresh_dashboard":
                stats = await self._get_dashboard_stats()
                await self.send(text_data=json.dumps({
                    "type": "dashboard_update",
                    "data": stats,
                }))
            elif action == "get_alerts":
                alerts = await self._get_attendance_alerts()
                await self.send(text_data=json.dumps({
                    "type": "attendance_alerts",
                    "data": alerts,
                }))
        except json.JSONDecodeError:
            pass

    # Group message handlers
    async def faculty_notification(self, event):
        """Send notification to faculty."""
        await self.send(text_data=json.dumps({
            "type": "notification",
            "data": event.get("data", {}),
        }))

    async def new_submission(self, event):
        """Alert faculty of new assignment submission."""
        await self.send(text_data=json.dumps({
            "type": "new_submission",
            "data": event.get("data", {}),
        }))

    async def attendance_alert(self, event):
        """Low attendance alert."""
        await self.send(text_data=json.dumps({
            "type": "attendance_alert",
            "data": event.get("data", {}),
        }))

    async def new_chat_message(self, event):
        """New chat message notification."""
        await self.send(text_data=json.dumps({
            "type": "new_chat_message",
            "data": event.get("data", {}),
        }))

    async def announcement_received(self, event):
        """Announcement from admin/super_admin."""
        await self.send(text_data=json.dumps({
            "type": "announcement_received",
            "data": event.get("data", {}),
        }))

    async def event_reminder(self, event):
        """Event reminder notification."""
        await self.send(text_data=json.dumps({
            "type": "event_reminder",
            "data": event.get("data", {}),
        }))

    async def grade_update(self, event):
        """Grade submission notification."""
        await self.send(text_data=json.dumps({
            "type": "grade_update",
            "data": event.get("data", {}),
        }))

    async def study_group_activity(self, event):
        """Study group activity notification."""
        await self.send(text_data=json.dumps({
            "type": "study_group_activity",
            "data": event.get("data", {}),
        }))

    @database_sync_to_async
    def _get_role(self):
        return self.user.role

    @database_sync_to_async
    def _get_dashboard_stats(self):
        from django.db.models import Q, Count, F
        from django.contrib.auth import get_user_model
        from apps.assignments.models import Assignment, AssignmentSubmission
        from apps.attendance.models import SubjectAttendance
        from .models import (
            FacultyProfile, FacultyAnnouncement, AttendanceSession, FacultyChat,
        )

        User = get_user_model()
        user = self.user
        profile = getattr(user, "faculty_profile", None)
        now = timezone.now()
        today = now.date()

        sections = profile.sections_assigned if profile else []
        branches = profile.branches_assigned if profile else []

        student_filter = Q(role="student", is_active=True)
        if sections:
            student_filter &= Q(section__in=sections)
        if branches:
            student_filter &= Q(branch__in=branches)

        total_students = User.objects.filter(student_filter).count()

        my_assignments = Assignment.objects.filter(created_by=user, is_active=True)
        pending_evaluations = AssignmentSubmission.objects.filter(
            assignment__created_by=user, status="submitted"
        ).count()

        low_attendance = SubjectAttendance.objects.filter(
            student__role="student", student__is_active=True, total_classes__gt=0
        ).annotate(
            pct=F("attended_classes") * 100.0 / F("total_classes")
        ).filter(pct__lt=75).values("student").distinct().count()

        todays_classes = AttendanceSession.objects.filter(
            faculty=user, date=today
        ).count()

        recent_submissions = AssignmentSubmission.objects.filter(
            assignment__created_by=user,
            submitted_at__gte=now - timezone.timedelta(days=7)
        ).count()

        unread_messages = FacultyChat.objects.filter(
            faculty=user, is_active=True, unread_count_faculty__gt=0
        ).count()

        return {
            "total_students": total_students,
            "pending_evaluations": pending_evaluations,
            "low_attendance_students": low_attendance,
            "todays_classes": todays_classes,
            "recent_submissions": recent_submissions,
            "unread_messages": unread_messages,
            "pending_assignments": my_assignments.filter(deadline__gte=now).count(),
        }

    @database_sync_to_async
    def _get_attendance_alerts(self):
        from .models import AttendanceAlert
        alerts = AttendanceAlert.objects.filter(
            is_acknowledged=False, notified_faculty=True
        ).select_related("student").order_by("-created_at")[:20]
        return [{
            "id": str(a.id),
            "student_name": a.student.full_name,
            "subject": a.subject_name,
            "percentage": float(a.current_percentage),
            "level": a.alert_level,
            "created_at": a.created_at.isoformat(),
        } for a in alerts]


class FacultyChatConsumer(AsyncWebsocketConsumer):
    """Real-time chat between faculty and students."""

    async def connect(self):
        self.user = self.scope.get("user")
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.chat_id = self.scope["url_route"]["kwargs"].get("chat_id")
        if not self.chat_id:
            await self.close(code=4000)
            return

        # Verify user is participant
        is_participant = await self._verify_participant()
        if not is_participant:
            await self.close(code=4003)
            return

        self.group_name = f"faculty_chat_{self.chat_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send recent messages
        messages = await self._get_recent_messages()
        await self.send(text_data=json.dumps({
            "type": "chat_history",
            "data": messages,
        }))

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming chat messages."""
        try:
            data = json.loads(text_data)
            action = data.get("action")

            if action == "send_message":
                message = await self._save_message(data.get("content", ""), data.get("message_type", "text"))
                if message:
                    await self.channel_layer.group_send(self.group_name, {
                        "type": "chat_message",
                        "data": message,
                    })
            elif action == "typing":
                await self.channel_layer.group_send(self.group_name, {
                    "type": "typing_indicator",
                    "data": {
                        "user_id": str(self.user.id),
                        "user_name": self.user.full_name,
                        "is_typing": data.get("is_typing", True),
                    },
                })
            elif action == "mark_read":
                await self._mark_messages_read()
                await self.channel_layer.group_send(self.group_name, {
                    "type": "read_receipt",
                    "data": {
                        "user_id": str(self.user.id),
                        "read_at": timezone.now().isoformat(),
                    },
                })
        except json.JSONDecodeError:
            pass

    async def chat_message(self, event):
        """Broadcast chat message to group."""
        await self.send(text_data=json.dumps({
            "type": "new_message",
            "data": event.get("data", {}),
        }))

    async def typing_indicator(self, event):
        """Broadcast typing indicator."""
        # Don't send to the sender
        if event["data"].get("user_id") != str(self.user.id):
            await self.send(text_data=json.dumps({
                "type": "typing",
                "data": event.get("data", {}),
            }))

    async def read_receipt(self, event):
        """Broadcast read receipt."""
        await self.send(text_data=json.dumps({
            "type": "read_receipt",
            "data": event.get("data", {}),
        }))

    @database_sync_to_async
    def _verify_participant(self):
        from .models import FacultyChat
        try:
            chat = FacultyChat.objects.get(id=self.chat_id, is_active=True)
            if self.user.role in ("admin", "super_admin"):
                return True
            return chat.faculty == self.user or chat.student == self.user
        except FacultyChat.DoesNotExist:
            return False

    @database_sync_to_async
    def _get_recent_messages(self):
        from .models import FacultyChatMessage
        messages = FacultyChatMessage.objects.filter(
            chat_id=self.chat_id, is_deleted=False
        ).select_related("sender").order_by("-created_at")[:50]
        return [{
            "id": str(m.id),
            "sender_id": str(m.sender.id),
            "sender_name": m.sender.full_name,
            "sender_role": m.sender.role,
            "content": m.content,
            "message_type": m.message_type,
            "file": m.file.url if m.file else None,
            "file_name": m.file_name,
            "is_read": m.is_read,
            "is_edited": m.is_edited,
            "created_at": m.created_at.isoformat(),
        } for m in reversed(messages)]

    @database_sync_to_async
    def _save_message(self, content, message_type="text"):
        from .models import FacultyChat, FacultyChatMessage
        if not content.strip():
            return None

        try:
            chat = FacultyChat.objects.get(id=self.chat_id, is_active=True)
        except FacultyChat.DoesNotExist:
            return None

        message = FacultyChatMessage.objects.create(
            chat=chat,
            sender=self.user,
            content=content,
            message_type=message_type,
        )

        # Update chat metadata
        chat.last_message_at = timezone.now()
        if self.user == chat.faculty:
            chat.unread_count_student += 1
        else:
            chat.unread_count_faculty += 1
        chat.save(update_fields=["last_message_at", "unread_count_student", "unread_count_faculty"])

        return {
            "id": str(message.id),
            "sender_id": str(self.user.id),
            "sender_name": self.user.full_name,
            "sender_role": self.user.role,
            "content": message.content,
            "message_type": message.message_type,
            "file": None,
            "file_name": "",
            "is_read": False,
            "is_edited": False,
            "created_at": message.created_at.isoformat(),
        }

    @database_sync_to_async
    def _mark_messages_read(self):
        from .models import FacultyChat, FacultyChatMessage
        try:
            chat = FacultyChat.objects.get(id=self.chat_id)
        except FacultyChat.DoesNotExist:
            return

        # Mark all unread messages from the other party as read
        FacultyChatMessage.objects.filter(
            chat=chat, is_read=False
        ).exclude(sender=self.user).update(is_read=True, read_at=timezone.now())

        # Reset unread count
        if self.user == chat.faculty:
            chat.unread_count_faculty = 0
        else:
            chat.unread_count_student = 0
        chat.save(update_fields=["unread_count_faculty", "unread_count_student"])
