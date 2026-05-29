"""
WebSocket URL routing for CampusHub.
"""
from django.urls import path
from apps.notifications.consumers import NotificationConsumer, AdminNotificationConsumer
from apps.study_groups.consumers import GroupChatConsumer
from apps.saved.consumers import SavedContentConsumer
from apps.communication.consumers import ChatConsumer, DMConsumer
from apps.events.consumers import EventLiveConsumer
from apps.attendance.consumers import AttendanceConsumer
from apps.cgpa.consumers import AcademicConsumer
from apps.faculty.consumers import FacultyDashboardConsumer, FacultyChatConsumer
from apps.moderation.consumers import ModerationDashboardConsumer
from apps.feedback.consumers import FeedbackConsumer
from apps.admin_dashboard.consumers import AdminDashboardConsumer

websocket_urlpatterns = [
    path("ws/notifications/", NotificationConsumer.as_asgi()),
    path("ws/admin/notifications/", AdminNotificationConsumer.as_asgi()),
    path("ws/groups/<uuid:group_id>/chat/", GroupChatConsumer.as_asgi()),
    path("ws/saved/", SavedContentConsumer.as_asgi()),
    # Communication
    path("ws/chat/<slug:slug>/", ChatConsumer.as_asgi()),
    path("ws/dm/<uuid:conversation_id>/", DMConsumer.as_asgi()),
    # Events
    path("ws/events/<uuid:event_id>/live/", EventLiveConsumer.as_asgi()),
    # Attendance real-time sync
    path("ws/attendance/", AttendanceConsumer.as_asgi()),
    # Academic performance real-time sync
    path("ws/academic/", AcademicConsumer.as_asgi()),
    # Faculty & Moderation dashboards
    path("ws/faculty/", FacultyDashboardConsumer.as_asgi()),
    path("ws/faculty/chat/<uuid:chat_id>/", FacultyChatConsumer.as_asgi()),
    path("ws/moderation/", ModerationDashboardConsumer.as_asgi()),
    # Feedback real-time updates
    path("ws/feedback/", FeedbackConsumer.as_asgi()),
    # Admin Dashboard real-time updates
    path("ws/admin/dashboard/", AdminDashboardConsumer.as_asgi()),
]
