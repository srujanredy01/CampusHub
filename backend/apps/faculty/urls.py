"""
Faculty Dashboard URL configuration.
"""
from django.urls import path
from .views import (
    FacultyDashboardView,
    FacultyProfileViewSet,
    StudentManagementView,
    FacultyAnnouncementViewSet,
    FacultyResourceViewSet,
    AttendanceSessionViewSet,
    GradeEntryViewSet,
    AttendanceAnalyticsView,
    AssignmentManagementView,
    FacultyStudentDetailView,
    FacultyAssignmentCreateView,
    FacultyAssignmentDetailView,
    FacultySubmissionReviewView,
    FacultyAcademicAnalyticsView,
    FacultyAttendanceExportView,
    FacultyNoteVerificationView,
    FacultyPlacementView,
    # Chat views
    FacultyChatListView,
    FacultyChatDetailView,
    FacultyChatCreateView,
    FacultyChatMessageListView,
    FacultyChatSendMessageView,
    # Event views
    FacultyEventListView,
    FacultyEventDetailView,
    FacultyEventRegistrationsView,
    FacultyEventAttendanceView,
    # Alert views
    AttendanceAlertListView,
    # Study groups
    FacultyStudyGroupsView,
    # Admin announcements to faculty
    AdminToFacultyAnnouncementView,
    AdminToFacultyAnnouncementAcknowledgeView,
    # Admin visibility
    AdminFacultyOverviewView,
    AdminFacultyChatsView,
    # Section performance
    SectionPerformanceView,
)

urlpatterns = [
    # Dashboard
    path("dashboard", FacultyDashboardView.as_view(), name="faculty-dashboard"),

    # Profile
    path("profile", FacultyProfileViewSet.as_view({"get": "me", "put": "update"}), name="faculty-profile"),

    # Student Management
    path("students", StudentManagementView.as_view(), name="faculty-students"),
    path("students/<uuid:pk>", FacultyStudentDetailView.as_view(), name="faculty-student-detail"),

    # Announcements
    path("announcements", FacultyAnnouncementViewSet.as_view({"get": "list", "post": "create"}), name="faculty-announcements"),
    path("announcements/<uuid:pk>", FacultyAnnouncementViewSet.as_view({"get": "retrieve", "put": "update", "delete": "destroy"}), name="faculty-announcement-detail"),

    # Resources
    path("resources", FacultyResourceViewSet.as_view({"get": "list", "post": "create"}), name="faculty-resources"),
    path("resources/<uuid:pk>", FacultyResourceViewSet.as_view({"get": "retrieve", "put": "update", "delete": "destroy"}), name="faculty-resource-detail"),

    # Attendance
    path("attendance/sessions", AttendanceSessionViewSet.as_view({"get": "list", "post": "create"}), name="faculty-attendance-sessions"),
    path("attendance/sessions/<uuid:pk>", AttendanceSessionViewSet.as_view({"get": "retrieve", "put": "update"}), name="faculty-attendance-session-detail"),
    path("attendance/sessions/<uuid:pk>/records", AttendanceSessionViewSet.as_view({"get": "records"}), name="faculty-attendance-records"),
    path("attendance/bulk-mark", AttendanceSessionViewSet.as_view({"post": "bulk_mark"}), name="faculty-attendance-bulk"),
    path("attendance/analytics", AttendanceAnalyticsView.as_view(), name="faculty-attendance-analytics"),
    path("attendance/export", FacultyAttendanceExportView.as_view(), name="faculty-attendance-export"),
    path("attendance/alerts", AttendanceAlertListView.as_view(), name="faculty-attendance-alerts"),

    # Grades
    path("grades", GradeEntryViewSet.as_view({"get": "list", "post": "create"}), name="faculty-grades"),
    path("grades/<uuid:pk>", GradeEntryViewSet.as_view({"get": "retrieve", "put": "update", "delete": "destroy"}), name="faculty-grade-detail"),
    path("grades/bulk-upload", GradeEntryViewSet.as_view({"post": "bulk_upload"}), name="faculty-grades-bulk"),
    path("grades/analytics", GradeEntryViewSet.as_view({"get": "analytics"}), name="faculty-grades-analytics"),

    # Assignments
    path("assignments", AssignmentManagementView.as_view(), name="faculty-assignments"),
    path("assignments/create", FacultyAssignmentCreateView.as_view(), name="faculty-assignment-create"),
    path("assignments/<uuid:pk>", FacultyAssignmentDetailView.as_view(), name="faculty-assignment-detail"),
    path("assignments/<uuid:pk>/submissions", FacultySubmissionReviewView.as_view(), name="faculty-assignment-submissions"),
    path("assignments/submissions/<uuid:sub_id>/grade", FacultySubmissionReviewView.as_view(), name="faculty-submission-grade"),

    # Analytics
    path("analytics", FacultyAcademicAnalyticsView.as_view(), name="faculty-analytics"),

    # Notes verification
    path("notes/verify", FacultyNoteVerificationView.as_view(), name="faculty-notes-verify"),
    path("notes/verify/<uuid:pk>", FacultyNoteVerificationView.as_view(), name="faculty-note-verify-action"),

    # Placement (for coordinators)
    path("placement", FacultyPlacementView.as_view(), name="faculty-placement"),

    # ── Faculty Chat ──────────────────────────────────────────────────────────
    path("chats", FacultyChatListView.as_view(), name="faculty-chats"),
    path("chats/create", FacultyChatCreateView.as_view(), name="faculty-chat-create"),
    path("chats/<uuid:pk>", FacultyChatDetailView.as_view(), name="faculty-chat-detail"),
    path("chats/<uuid:pk>/messages", FacultyChatMessageListView.as_view(), name="faculty-chat-messages"),
    path("chats/<uuid:pk>/send", FacultyChatSendMessageView.as_view(), name="faculty-chat-send"),

    # ── Faculty Events ────────────────────────────────────────────────────────
    path("events", FacultyEventListView.as_view(), name="faculty-events"),
    path("events/<uuid:pk>", FacultyEventDetailView.as_view(), name="faculty-event-detail"),
    path("events/<uuid:pk>/registrations", FacultyEventRegistrationsView.as_view(), name="faculty-event-registrations"),
    path("events/<uuid:pk>/attendance", FacultyEventAttendanceView.as_view(), name="faculty-event-attendance"),

    # ── Study Groups ──────────────────────────────────────────────────────────
    path("study-groups", FacultyStudyGroupsView.as_view(), name="faculty-study-groups"),

    # ── Admin Announcements to Faculty ────────────────────────────────────────
    path("admin-announcements", AdminToFacultyAnnouncementView.as_view(), name="faculty-admin-announcements"),
    path("admin-announcements/<uuid:pk>/acknowledge", AdminToFacultyAnnouncementAcknowledgeView.as_view(), name="faculty-admin-announcement-ack"),

    # ── Admin Visibility (Super Admin / Admin only) ───────────────────────────
    path("admin/overview", AdminFacultyOverviewView.as_view(), name="faculty-admin-overview"),
    path("admin/chats", AdminFacultyChatsView.as_view(), name="faculty-admin-chats"),

    # ── Section Performance ───────────────────────────────────────────────────
    path("section-performance", SectionPerformanceView.as_view(), name="faculty-section-performance"),
]
