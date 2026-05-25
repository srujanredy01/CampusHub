"""
WebSocket URL routing for CampusHub.
"""
from django.urls import path
from apps.notifications.consumers import NotificationConsumer, AdminNotificationConsumer

websocket_urlpatterns = [
    path("ws/notifications/", NotificationConsumer.as_asgi()),
    path("ws/admin/notifications/", AdminNotificationConsumer.as_asgi()),
]
