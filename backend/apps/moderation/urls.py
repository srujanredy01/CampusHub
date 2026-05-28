"""
Moderation Dashboard URL configuration — production-grade moderation system.
"""
from django.urls import path
from .views import (
    ModerationDashboardView,
    ModeratorProfileView,
    ContentReportListView,
    ContentReportCreateView,
    ContentReportDetailView,
    ChannelModerationView,
    ApprovalRequestListView,
    ApprovalRequestActionView,
    ChatModerationView,
    UserWarningListView,
    UserBanListView,
    UserBanLiftView,
    UserMuteListView,
    UserModerationHistoryView,
    ModerationActionLogView,
    ModerationAnalyticsView,
    StudyGroupModerationView,
    NotesModerationView,
    AutoModerationRuleListView,
    AutoModerationRuleDetailView,
    AutoModerationLogListView,
    EscalationConfigView,
    UserViolationListView,
    AdminModerationOverrideView,
)

urlpatterns = [
    # Dashboard & Profile
    path("dashboard", ModerationDashboardView.as_view(), name="moderation-dashboard"),
    path("profile", ModeratorProfileView.as_view(), name="moderation-profile"),

    # Reports
    path("reports", ContentReportListView.as_view(), name="moderation-reports"),
    path("reports/create", ContentReportCreateView.as_view(), name="moderation-report-create"),
    path("reports/<uuid:pk>", ContentReportDetailView.as_view(), name="moderation-report-detail"),

    # Channel moderation
    path("channels", ChannelModerationView.as_view(), name="moderation-channels"),

    # Approvals (roadmaps, notes, study groups)
    path("approvals", ApprovalRequestListView.as_view(), name="moderation-approvals"),
    path("approvals/<uuid:pk>", ApprovalRequestActionView.as_view(), name="moderation-approval-action"),

    # Chat moderation
    path("chat", ChatModerationView.as_view(), name="moderation-chat"),

    # Warnings
    path("warnings", UserWarningListView.as_view(), name="moderation-warnings"),

    # Bans
    path("bans", UserBanListView.as_view(), name="moderation-bans"),
    path("bans/<uuid:pk>/lift", UserBanLiftView.as_view(), name="moderation-ban-lift"),

    # Mutes
    path("mutes", UserMuteListView.as_view(), name="moderation-mutes"),

    # User moderation history
    path("users/<uuid:user_id>/history", UserModerationHistoryView.as_view(), name="moderation-user-history"),

    # Violations
    path("violations", UserViolationListView.as_view(), name="moderation-violations"),

    # Audit logs
    path("logs", ModerationActionLogView.as_view(), name="moderation-logs"),

    # Analytics
    path("analytics", ModerationAnalyticsView.as_view(), name="moderation-analytics"),

    # Study groups
    path("study-groups", StudyGroupModerationView.as_view(), name="moderation-study-groups"),

    # Notes
    path("notes", NotesModerationView.as_view(), name="moderation-notes"),
    path("notes/<uuid:pk>", NotesModerationView.as_view(), name="moderation-note-action"),

    # Auto-moderation rules
    path("auto-rules", AutoModerationRuleListView.as_view(), name="moderation-auto-rules"),
    path("auto-rules/<uuid:pk>", AutoModerationRuleDetailView.as_view(), name="moderation-auto-rule-detail"),
    path("auto-logs", AutoModerationLogListView.as_view(), name="moderation-auto-logs"),

    # Escalation config
    path("escalation", EscalationConfigView.as_view(), name="moderation-escalation"),

    # Admin override
    path("admin-override", AdminModerationOverrideView.as_view(), name="moderation-admin-override"),
]
