from django.urls import path
from .views import (
    ContestListView, ContestDetailView, ContestRegisterView,
    ContestLeaderboardView, ContestSubmitView,
    AdminContestCreateView, AdminContestUpdateView,
    AdminContestAddProblemView,
)

urlpatterns = [
    # Student endpoints
    path("", ContestListView.as_view(), name="contest-list"),
    path("<uuid:pk>", ContestDetailView.as_view(), name="contest-detail"),
    path("<uuid:pk>/register", ContestRegisterView.as_view(), name="contest-register"),
    path("<uuid:pk>/leaderboard", ContestLeaderboardView.as_view(), name="contest-leaderboard"),
    path("<uuid:pk>/submit/<uuid:problem_id>", ContestSubmitView.as_view(), name="contest-submit"),

    # Admin endpoints
    path("admin/create", AdminContestCreateView.as_view(), name="admin-contest-create"),
    path("admin/<uuid:pk>", AdminContestUpdateView.as_view(), name="admin-contest-update"),
    path("admin/<uuid:pk>/problems", AdminContestAddProblemView.as_view(), name="admin-contest-add-problem"),
]
