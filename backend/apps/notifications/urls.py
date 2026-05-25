from django.urls import path
from .views import (
    NotificationListView,
    MarkReadView,
    NotificationDeleteView,
    NotificationUnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("mark-read", MarkReadView.as_view(), name="notification-mark-read"),
    path("unread-count", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
    path("<uuid:pk>", NotificationDeleteView.as_view(), name="notification-delete"),
]
