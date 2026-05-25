from django.urls import path
from .views import ProfileView, ActivityHistoryView

urlpatterns = [
    path("", ProfileView.as_view(), name="profile"),
    path("activity", ActivityHistoryView.as_view(), name="profile-activity"),
]
