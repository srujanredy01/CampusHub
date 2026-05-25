from django.urls import path
from .views import (
    AttendanceListView,
    AttendanceCreateView,
    AttendanceDetailView,
    AttendanceSummaryView,
    AttendanceMarkView,
    AttendanceOverviewView,
    AttendancePredictionView,
    AttendanceHistoryView,
)

urlpatterns = [
    path("",              AttendanceListView.as_view(),       name="attendance-list"),
    path("create",        AttendanceCreateView.as_view(),     name="attendance-create"),
    path("summary",       AttendanceSummaryView.as_view(),    name="attendance-summary"),
    path("overview",      AttendanceOverviewView.as_view(),   name="attendance-overview"),
    path("history",       AttendanceHistoryView.as_view(),    name="attendance-history"),
    path("<uuid:pk>",     AttendanceDetailView.as_view(),     name="attendance-detail"),
    path("<uuid:pk>/mark",    AttendanceMarkView.as_view(),   name="attendance-mark"),
    path("<uuid:pk>/predict", AttendancePredictionView.as_view(), name="attendance-predict"),
]
