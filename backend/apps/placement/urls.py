from django.urls import path
from .views import (
    ApplicationListView, ApplicationCreateView, ApplicationDetailView,
    InterviewCreateView, PlacementKanbanView, PlacementStatsView,
    PlacementReadinessView, CompanyNoteListView, CompanyNoteDetailView,
)

urlpatterns = [
    path("applications", ApplicationListView.as_view(), name="placement-list"),
    path("applications/create", ApplicationCreateView.as_view(), name="placement-create"),
    path("applications/<uuid:pk>", ApplicationDetailView.as_view(), name="placement-detail"),
    path("applications/<uuid:pk>/interviews", InterviewCreateView.as_view(), name="placement-interviews"),
    path("kanban", PlacementKanbanView.as_view(), name="placement-kanban"),
    path("stats", PlacementStatsView.as_view(), name="placement-stats"),
    path("readiness", PlacementReadinessView.as_view(), name="placement-readiness"),
    path("company-notes", CompanyNoteListView.as_view(), name="company-notes-list"),
    path("company-notes/<uuid:pk>", CompanyNoteDetailView.as_view(), name="company-notes-detail"),
]
