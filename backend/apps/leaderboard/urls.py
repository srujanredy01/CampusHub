from django.urls import path
from .views import LeaderboardView, MyXPView, BadgeListView, XPHistoryView

urlpatterns = [
    path("", LeaderboardView.as_view(), name="leaderboard"),
    path("me", MyXPView.as_view(), name="leaderboard-me"),
    path("badges", BadgeListView.as_view(), name="leaderboard-badges"),
    path("history", XPHistoryView.as_view(), name="leaderboard-history"),
]
