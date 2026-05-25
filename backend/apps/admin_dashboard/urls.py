from django.urls import path
from .views import (
    AdminDashboardView,
    AdminStudentListView,
    AdminStudentDetailView,
    AdminStudentActivateView,
    AdminStudentDeactivateView,
    AdminStudentResetPasswordView,
    AdminStudentRoleUpdateView,
    AdminStudentImportView,
    AdminStudentExportView,
    AdminResourceListView,
    AdminResourceUploadView,
    AdminResourceDetailView,
    AdminResourceToggleView,
    AdminResourceStatsView,
    AdminNewsListView,
    AdminNewsCreateView,
    AdminNewsDetailView,
    AdminNewsPinView,
    AdminNewsStatsView,
    AdminQuestionListView,
    AdminExecutionStatsView,
    AdminAnalyticsView,
    AdminSendNotificationView,
    AdminScheduledNotificationListCreateView,
    AdminScheduledNotificationDetailView,
    AdminScheduledNotificationApproveView,
    AdminScheduledNotificationDispatchView,
    AdminAuditLogView,
    AdminSystemHealthView,
    AdminActivityLogView,
    AdminActivityStatsView,
    AdminApprovalsView,
    AdminLoginLogView,
    AdminGlobalSearchView,
)
from apps.notes.views import AdminNoteViewSet
from apps.attendance.views import (
    AdminAttendanceDashboardView,
    AdminAttendanceStudentListView,
    AdminAttendanceStudentDetailView,
    AdminAttendanceExportView,
)
from apps.notifications.views import (
    AdminAlertListView,
    AdminAlertMarkReadView,
    AdminAlertDeleteView,
    AdminAlertStatsView,
    AdminSendTargetedNotificationView,
)

urlpatterns = [
    # Dashboard
    path("dashboard",                              AdminDashboardView.as_view(),              name="admin-dashboard"),

    # Students — static paths MUST come before <uuid:pk> to avoid routing conflicts
    path("students",                               AdminStudentListView.as_view(),             name="admin-students"),
    path("students/import",                        AdminStudentImportView.as_view(),           name="admin-student-import"),
    path("students/export",                        AdminStudentExportView.as_view(),           name="admin-student-export"),
    path("students/<uuid:pk>",                     AdminStudentDetailView.as_view(),           name="admin-student-detail"),
    path("students/<uuid:pk>/activate",            AdminStudentActivateView.as_view(),         name="admin-student-activate"),
    path("students/<uuid:pk>/deactivate",          AdminStudentDeactivateView.as_view(),       name="admin-student-deactivate"),
    path("students/<uuid:pk>/reset-password",      AdminStudentResetPasswordView.as_view(),    name="admin-student-reset-password"),
    path("students/<uuid:pk>/role",                AdminStudentRoleUpdateView.as_view(),       name="admin-student-role"),

    # Resources — static paths before <uuid:pk>
    path("resources",                              AdminResourceListView.as_view(),            name="admin-resources"),
    path("resources/upload",                       AdminResourceUploadView.as_view(),          name="admin-resource-upload"),
    path("resources/stats",                        AdminResourceStatsView.as_view(),           name="admin-resource-stats"),
    path("resources/<uuid:pk>",                    AdminResourceDetailView.as_view(),          name="admin-resource-detail"),
    path("resources/<uuid:pk>/toggle",             AdminResourceToggleView.as_view(),          name="admin-resource-toggle"),

    # Notes moderation
    path("notes",                                  AdminNoteViewSet.as_view({"get": "list"}),                name="admin-notes"),
    path("notes/<uuid:pk>",                        AdminNoteViewSet.as_view({"delete": "destroy"}),          name="admin-note-delete"),
    path("notes/<uuid:pk>/moderate",               AdminNoteViewSet.as_view({"post": "moderate"}),          name="admin-note-moderate"),

    # News — static paths before <uuid:pk>
    path("news",                                   AdminNewsListView.as_view(),                name="admin-news"),
    path("news/create",                            AdminNewsCreateView.as_view(),              name="admin-news-create"),
    path("news/stats",                             AdminNewsStatsView.as_view(),               name="admin-news-stats"),
    path("news/<uuid:pk>",                         AdminNewsDetailView.as_view(),              name="admin-news-detail"),
    path("news/<uuid:pk>/pin",                     AdminNewsPinView.as_view(),                 name="admin-news-pin"),

    # Coding
    path("questions",                              AdminQuestionListView.as_view(),            name="admin-questions"),

    # Monitoring
    path("executions",                             AdminExecutionStatsView.as_view(),          name="admin-executions"),
    path("analytics",                              AdminAnalyticsView.as_view(),               name="admin-analytics"),
    path("notifications",                          AdminSendNotificationView.as_view(),        name="admin-notifications"),
    path("notifications/scheduled",                AdminScheduledNotificationListCreateView.as_view(), name="admin-notifications-scheduled"),
    path("notifications/scheduled/<uuid:pk>/approve", AdminScheduledNotificationApproveView.as_view(), name="admin-notifications-scheduled-approve"),
    path("notifications/scheduled/<uuid:pk>/dispatch", AdminScheduledNotificationDispatchView.as_view(), name="admin-notifications-scheduled-dispatch"),
    path("notifications/scheduled/<uuid:pk>",      AdminScheduledNotificationDetailView.as_view(), name="admin-notifications-scheduled-detail"),
    path("logs",                                   AdminAuditLogView.as_view(),                name="admin-logs"),
    path("login-logs",                             AdminLoginLogView.as_view(),                name="admin-login-logs"),
    path("approvals",                              AdminApprovalsView.as_view(),               name="admin-approvals"),
    path("search",                                 AdminGlobalSearchView.as_view(),            name="admin-search"),
    path("system/health",                          AdminSystemHealthView.as_view(),            name="admin-system-health"),

    # User activity tracking
    path("activity-logs",                          AdminActivityLogView.as_view(),             name="admin-activity-logs"),
    path("activity-stats",                         AdminActivityStatsView.as_view(),           name="admin-activity-stats"),

    # Attendance management
    path("attendance/dashboard",                   AdminAttendanceDashboardView.as_view(),     name="admin-attendance-dashboard"),
    path("attendance/students",                    AdminAttendanceStudentListView.as_view(),   name="admin-attendance-students"),
    path("attendance/students/<uuid:pk>",          AdminAttendanceStudentDetailView.as_view(), name="admin-attendance-student-detail"),
    path("attendance/export",                      AdminAttendanceExportView.as_view(),        name="admin-attendance-export"),

    # Real-time alerts
    path("alerts",                                 AdminAlertListView.as_view(),               name="admin-alerts"),
    path("alerts/mark-read",                       AdminAlertMarkReadView.as_view(),           name="admin-alerts-mark-read"),
    path("alerts/stats",                           AdminAlertStatsView.as_view(),              name="admin-alerts-stats"),
    path("alerts/<uuid:pk>",                       AdminAlertDeleteView.as_view(),             name="admin-alert-delete"),

    # Targeted notifications
    path("notifications/send",                     AdminSendTargetedNotificationView.as_view(), name="admin-notifications-send"),
]
