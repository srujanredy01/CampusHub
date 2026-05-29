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
from apps.roadmaps.views import AdminRoadmapListCreateView, AdminRoadmapDetailView, AdminMilestoneCreateView, AdminStepCreateView
from apps.resume.views import AdminResumeTemplateListCreateView, AdminResumeTemplateDetailView
from apps.lost_found.views import AdminLostFoundListView, AdminLostFoundRemoveView
from apps.assignments.views import (
    AdminAssignmentCreateView, AdminAssignmentDetailView,
    AdminAssignmentSubmissionsView, AdminAssignmentGradeView,
)
from apps.communication.views import (
    AdminChannelListView, AdminAllMessagesView, AdminDMListView,
    AdminReportsView, AdminResolveReportView, AdminModerationLogView,
    AdminOnlineUsersView, AdminCommStatsView,
    AdminChannelRequestQueueView, AdminChannelRequestReviewView,
)
from apps.events.views import (
    AdminEventListView, AdminEventDetailView, AdminEventRegistrationsView,
    AdminEventStatsView, AdminAllCertificatesView,
)
from .admin_views import (
    AdminDepartmentListCreateView, AdminDepartmentDetailView,
    AdminSectionListCreateView, AdminSectionDetailView, AdminSectionMoveStudentView,
    AdminCreateUserView,
    AdminFacultyListView, AdminFacultyDetailView,
    AdminModeratorListView, AdminModeratorDetailView,
    AdminAnnouncementListCreateView, AdminAnnouncementDetailView,
    AdminLiveAnalyticsView,
    AdminModerationOverviewView, AdminAcademicOverviewView,
    AdminStudyGroupOverviewView, AdminStudyGroupActionView,
    AdminChannelOverviewView, AdminChannelActionView,
    AdminPlacementOverviewView, AdminResourceOverviewView,
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

    # Roadmaps management
    path("roadmaps",                               AdminRoadmapListCreateView.as_view(),       name="admin-roadmaps"),
    path("roadmaps/<uuid:pk>",                     AdminRoadmapDetailView.as_view(),           name="admin-roadmap-detail"),
    path("roadmaps/<uuid:roadmap_id>/milestones",  AdminMilestoneCreateView.as_view(),         name="admin-roadmap-milestone"),
    path("roadmaps/milestones/<uuid:milestone_id>/steps", AdminStepCreateView.as_view(),       name="admin-roadmap-step"),

    # Resume templates
    path("resume/templates",                       AdminResumeTemplateListCreateView.as_view(), name="admin-resume-templates"),
    path("resume/templates/<uuid:pk>",             AdminResumeTemplateDetailView.as_view(),    name="admin-resume-template-detail"),

    # Lost & Found moderation
    path("lost-found",                             AdminLostFoundListView.as_view(),           name="admin-lost-found"),
    path("lost-found/<uuid:pk>",                   AdminLostFoundRemoveView.as_view(),         name="admin-lost-found-remove"),

    # Assignments management
    path("assignments",                            AdminAssignmentCreateView.as_view(),        name="admin-assignments-create"),
    path("assignments/<uuid:pk>",                  AdminAssignmentDetailView.as_view(),        name="admin-assignment-detail"),
    path("assignments/<uuid:pk>/submissions",      AdminAssignmentSubmissionsView.as_view(),   name="admin-assignment-submissions"),
    path("assignments/submissions/<uuid:sub_id>/grade", AdminAssignmentGradeView.as_view(),    name="admin-assignment-grade"),

    # Communication management
    path("communication/channels",                     AdminChannelListView.as_view(),           name="admin-comm-channels"),
    path("communication/messages",                     AdminAllMessagesView.as_view(),           name="admin-comm-messages"),
    path("communication/dms",                          AdminDMListView.as_view(),                name="admin-comm-dms"),
    path("communication/reports",                      AdminReportsView.as_view(),               name="admin-comm-reports"),
    path("communication/reports/<uuid:pk>/resolve",    AdminResolveReportView.as_view(),         name="admin-comm-report-resolve"),
    path("communication/moderation-log",               AdminModerationLogView.as_view(),         name="admin-comm-moderation-log"),
    path("communication/online-users",                 AdminOnlineUsersView.as_view(),           name="admin-comm-online-users"),
    path("communication/stats",                        AdminCommStatsView.as_view(),             name="admin-comm-stats"),
    path("communication/channel-requests",             AdminChannelRequestQueueView.as_view(),   name="admin-comm-channel-requests"),
    path("communication/channel-requests/<uuid:pk>/review", AdminChannelRequestReviewView.as_view(), name="admin-comm-channel-request-review"),

    # Events management
    path("events",                                     AdminEventListView.as_view(),             name="admin-events"),
    path("events/stats",                               AdminEventStatsView.as_view(),            name="admin-events-stats"),
    path("events/certificates",                        AdminAllCertificatesView.as_view(),       name="admin-events-certificates"),
    path("events/<slug:slug>",                         AdminEventDetailView.as_view(),           name="admin-event-detail"),
    path("events/<slug:slug>/registrations",           AdminEventRegistrationsView.as_view(),    name="admin-event-registrations"),

    # Faculty system visibility (admin can access via /api/faculty/admin/overview)

    # ── New Admin Dashboard Views ──────────────────────────────────────────
    # Departments
    path("departments",                            AdminDepartmentListCreateView.as_view(),    name="admin-departments"),
    path("departments/<uuid:pk>",                  AdminDepartmentDetailView.as_view(),        name="admin-department-detail"),

    # Sections
    path("sections",                               AdminSectionListCreateView.as_view(),       name="admin-sections"),
    path("sections/<uuid:pk>",                     AdminSectionDetailView.as_view(),           name="admin-section-detail"),
    path("sections/<uuid:pk>/move-student",        AdminSectionMoveStudentView.as_view(),      name="admin-section-move-student"),

    # User creation
    path("users/create",                           AdminCreateUserView.as_view(),              name="admin-user-create"),

    # Faculty management
    path("faculty",                                AdminFacultyListView.as_view(),             name="admin-faculty-list"),
    path("faculty/<uuid:pk>",                      AdminFacultyDetailView.as_view(),           name="admin-faculty-detail"),

    # Moderator management
    path("moderators",                             AdminModeratorListView.as_view(),           name="admin-moderator-list"),
    path("moderators/<uuid:pk>",                   AdminModeratorDetailView.as_view(),         name="admin-moderator-detail"),

    # Announcements
    path("announcements",                          AdminAnnouncementListCreateView.as_view(),  name="admin-announcements"),
    path("announcements/<uuid:pk>",                AdminAnnouncementDetailView.as_view(),      name="admin-announcement-detail"),

    # Live analytics
    path("live-analytics",                         AdminLiveAnalyticsView.as_view(),           name="admin-live-analytics"),

    # Overviews
    path("moderation-overview",                    AdminModerationOverviewView.as_view(),      name="admin-moderation-overview"),
    path("academic-overview",                      AdminAcademicOverviewView.as_view(),        name="admin-academic-overview"),
    path("study-groups-overview",                  AdminStudyGroupOverviewView.as_view(),      name="admin-study-groups-overview"),
    path("study-groups-overview/<uuid:pk>/action", AdminStudyGroupActionView.as_view(),        name="admin-study-group-action"),
    path("channels-overview",                      AdminChannelOverviewView.as_view(),         name="admin-channels-overview"),
    path("channels-overview/<uuid:pk>/action",     AdminChannelActionView.as_view(),           name="admin-channel-action"),
    path("placement-overview",                     AdminPlacementOverviewView.as_view(),       name="admin-placement-overview"),
    path("resource-overview",                      AdminResourceOverviewView.as_view(),        name="admin-resource-overview"),
]
